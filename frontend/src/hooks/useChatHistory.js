import { useState, useEffect } from 'react';

/**
 * useChatHistory — sidebar chat list, scoped per machine.
 *
 * Storage key  : tecdia_chat_history:{machineKey}
 * Lifetime     : persists in localStorage forever (until cleared by the user)
 *
 * Each machine gets its own isolated history — switching machines must remount
 * this hook (via a React `key` prop on ChatPage) so we read fresh data from the
 * new namespace. Without remount the `useState` initializer wouldn't re-run.
 */

const PREFIX = 'tecdia_chat_history';
const keyFor = (machineKey) => `${PREFIX}:${machineKey || 'ALL'}`;

const loadChats = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useChatHistory = (machineKey = 'ALL') => {
  const storageKey = keyFor(machineKey);

  const [chats, setChats] = useState(() => loadChats(storageKey));
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(chats));
  }, [chats, storageKey]);

  const currentChat = chats.find(c => c.id === currentChatId) || null;

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      lastModified: new Date().toISOString(),
    };
    setChats([newChat, ...chats]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const addMessage = (chatId, message) => {
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = [...chat.messages, {
          ...message,
          id: message.id || Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];

        // Update title if it's the first message
        let newTitle = chat.title;
        if (chat.messages.length === 0 && message.sender === 'user') {
          newTitle = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
        }

        return {
          ...chat,
          messages: updatedMessages,
          title: newTitle,
          lastModified: new Date().toISOString()
        };
      }
      return chat;
    }));
  };

  const deleteChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  const clearHistory = () => {
    setChats([]);
    setCurrentChatId(null);
  };

  return {
    chats,
    currentChatId,
    currentChat,
    setCurrentChatId,
    createNewChat,
    addMessage,
    deleteChat,
    clearHistory
  };
};
