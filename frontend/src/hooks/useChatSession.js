/**
 * useChatSession — API Contract v2 §7 compliant chat history hook.
 *
 * Storage key : smartfix.history
 * Shape stored: { history: [{role, content}], lastActivity: number }
 * Idle expiry : 15 minutes of inactivity clears history on next app load.
 *
 * The `history` array is sent directly as the `history` field in POST /query.
 * Each turn is a { role: "user" | "assistant", content: string } object.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'smartfix.history';
const IDLE_MS = 15 * 60 * 1000; // 15 minutes

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { history: [], lastActivity: Date.now() };
    const parsed = JSON.parse(raw);
    // Expire if idle too long
    if (Date.now() - (parsed.lastActivity || 0) > IDLE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return { history: [], lastActivity: Date.now() };
    }
    return parsed;
  } catch {
    return { history: [], lastActivity: Date.now() };
  }
};

export const useChatSession = () => {
  const [session, setSession] = useState(() => loadFromStorage());

  // Persist to localStorage whenever session changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  /**
   * Append one user turn and one assistant turn after a successful /query response.
   * Both are appended atomically so history is always in user/assistant pairs.
   *
   * @param {string} userContent     The question the user sent.
   * @param {string} assistantContent The answer returned by the API.
   */
  const appendTurn = useCallback((userContent, assistantContent) => {
    setSession(prev => ({
      history: [
        ...prev.history,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ],
      lastActivity: Date.now(),
    }));
  }, []);

  /**
   * Update lastActivity timestamp (call on every user interaction).
   */
  const updateLastActivity = useCallback(() => {
    setSession(prev => ({ ...prev, lastActivity: Date.now() }));
  }, []);

  /**
   * "Start over" — clears history and storage.
   */
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession({ history: [], lastActivity: Date.now() });
  }, []);

  return {
    /** Array of { role, content } — pass directly as `history` in POST /query body */
    history: session.history,
    appendTurn,
    updateLastActivity,
    clearHistory,
  };
};
