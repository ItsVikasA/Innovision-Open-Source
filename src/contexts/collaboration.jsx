'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToMessages } from '@/lib/message-store';
import { subscribeToPresence, setPresence, setOffline } from '@/lib/presence-manager';
import { useAuth } from './auth';

const CollaborationContext = createContext(null);

export function CollaborationProvider({ children, roomId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [presence, setPresenceList] = useState([]);

  useEffect(() => {
    if (!roomId || !user) return;

    setPresence(roomId, user.uid);

    const unsubMessages = subscribeToMessages(roomId, setMessages);
    const unsubPresence = subscribeToPresence(roomId, setPresenceList);

    return () => {
      setOffline(roomId, user.uid);
      unsubMessages();
      unsubPresence();
    };
  }, [roomId, user]);

  return (
    <CollaborationContext.Provider value={{ messages, presence, roomId }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export const useCollaboration = () => useContext(CollaborationContext);
