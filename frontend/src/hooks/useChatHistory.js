import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tecdia_chat_history';

export const useChatHistory = () => {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

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
