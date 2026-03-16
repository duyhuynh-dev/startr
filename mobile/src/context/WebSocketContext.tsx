import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { MobileWebSocketClient } from '../services/websocket';
import type { Message } from '../api/messaging';

interface WSContextValue {
  isConnected: boolean;
  sendTyping: (matchId: string, isTyping: boolean) => void;
  sendMarkRead: (messageId: string) => void;
  onNewMessage: (matchId: string, cb: (msg: Message) => void) => () => void;
  onTyping: (matchId: string, cb: (isTyping: boolean, senderId: string) => void) => () => void;
  onNotification: (cb: (data: any) => void) => () => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

const WSContext = createContext<WSContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const clientRef = useRef<MobileWebSocketClient | null>(null);
  const msgListeners = useRef(new Map<string, Set<(msg: Message) => void>>());
  const typingListeners = useRef(new Map<string, Set<(isTyping: boolean, senderId: string) => void>>());
  const notifListeners = useRef(new Set<(data: any) => void>());

  useEffect(() => {
    if (!user?.profile_id) {
      clientRef.current?.disconnect();
      clientRef.current = null;
      setIsConnected(false);
      return;
    }

    const client = new MobileWebSocketClient(user.profile_id);
    clientRef.current = client;

    client.on('connected', () => setIsConnected(true));
    client.on('disconnected', () => setIsConnected(false));

    client.on('new_message', (msg: Message) => {
      msgListeners.current.get(msg.match_id)?.forEach((cb) => cb(msg));
    });

    client.on('typing', (data: { matchId: string; senderId: string; isTyping: boolean }) => {
      typingListeners.current.get(data.matchId)?.forEach((cb) => cb(data.isTyping, data.senderId));
    });

    client.on('notification', (data: any) => {
      setUnreadNotifications((n) => n + 1);
      notifListeners.current.forEach((cb) => cb(data));
    });

    client.connect().catch(() => {});

    return () => { client.disconnect(); };
  }, [user?.profile_id]);

  const sendTyping = useCallback((matchId: string, isTyping: boolean) => {
    clientRef.current?.sendTyping(matchId, isTyping);
  }, []);

  const sendMarkRead = useCallback((messageId: string) => {
    clientRef.current?.sendMarkRead(messageId);
  }, []);

  const onNewMessage = useCallback((matchId: string, cb: (msg: Message) => void) => {
    if (!msgListeners.current.has(matchId)) msgListeners.current.set(matchId, new Set());
    msgListeners.current.get(matchId)!.add(cb);
    return () => { msgListeners.current.get(matchId)?.delete(cb); };
  }, []);

  const onTyping = useCallback((matchId: string, cb: (isTyping: boolean, senderId: string) => void) => {
    if (!typingListeners.current.has(matchId)) typingListeners.current.set(matchId, new Set());
    typingListeners.current.get(matchId)!.add(cb);
    return () => { typingListeners.current.get(matchId)?.delete(cb); };
  }, []);

  const onNotification = useCallback((cb: (data: any) => void) => {
    notifListeners.current.add(cb);
    return () => { notifListeners.current.delete(cb); };
  }, []);

  return (
    <WSContext.Provider value={{
      isConnected, sendTyping, sendMarkRead,
      onNewMessage, onTyping, onNotification,
      unreadNotifications, setUnreadNotifications,
    }}>
      {children}
    </WSContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be used within WebSocketProvider');
  return ctx;
}
