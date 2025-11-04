import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatwootUser } from '../utils/chatwootConfig';

interface ChatSupportContextType {
  user: ChatwootUser | null;
  setUser: (user: ChatwootUser) => void;
  clearUser: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const ChatSupportContext = createContext<ChatSupportContextType | undefined>(undefined);

export const ChatSupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<ChatwootUser | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const setUser = useCallback((newUser: ChatwootUser) => {
    setUserState(newUser);
    setError(null);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    setIsChatOpen(false);
    setError(null);
    setUnreadCount(0);
  }, []);

  const value: ChatSupportContextType = {
    user,
    setUser,
    clearUser,
    isChatOpen,
    setIsChatOpen,
    isLoading,
    setIsLoading,
    error,
    setError,
    unreadCount,
    setUnreadCount,
  };

  return (
    <ChatSupportContext.Provider value={value}>
      {children}
    </ChatSupportContext.Provider>
  );
};

export const useChatSupport = (): ChatSupportContextType => {
  const context = useContext(ChatSupportContext);
  if (!context) {
    throw new Error('useChatSupport must be used within ChatSupportProvider');
  }
  return context;
};
