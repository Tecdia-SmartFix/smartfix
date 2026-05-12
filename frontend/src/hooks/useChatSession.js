/**
 * useChatSession — API Contract v2 §7 compliant chat history hook, scoped per machine.
 *
 * Storage key : smartfix.history:{machineKey}
 * Shape stored: { history: [{role, content}], lastActivity: number }
 * Idle expiry : 15 minutes of inactivity clears history on next app load.
 *
 * The `history` array is sent directly as the `history` field in POST /query.
 * Each turn is a { role: "user" | "assistant", content: string } object.
 *
 * Scoped per machine so follow-up context never leaks across machines — asking
 * "and what about the next step?" on the laser-cutter chat must NOT carry an
 * injection-molding question in as the prior turn.
 */

import { useState, useEffect, useCallback } from 'react';

const PREFIX = 'smartfix.history';
const IDLE_MS = 15 * 60 * 1000; // 15 minutes

const keyFor = (machineKey) => `${PREFIX}:${machineKey || 'ALL'}`;

const loadFromStorage = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { history: [], lastActivity: Date.now() };
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.lastActivity || 0) > IDLE_MS) {
      localStorage.removeItem(storageKey);
      return { history: [], lastActivity: Date.now() };
    }
    return parsed;
  } catch {
    return { history: [], lastActivity: Date.now() };
  }
};

export const useChatSession = (machineKey = 'ALL') => {
  const storageKey = keyFor(machineKey);
  const [session, setSession] = useState(() => loadFromStorage(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(session));
  }, [session, storageKey]);

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

  const updateLastActivity = useCallback(() => {
    setSession(prev => ({ ...prev, lastActivity: Date.now() }));
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSession({ history: [], lastActivity: Date.now() });
  }, [storageKey]);

  return {
    history: session.history,
    appendTurn,
    updateLastActivity,
    clearHistory,
  };
};
