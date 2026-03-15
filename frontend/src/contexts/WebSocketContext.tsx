/**
 * WebSocket context for real-time messaging
 */

'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { MessagingWebSocketClient } from '@/lib/api/websocket';
import type { Message } from '@/lib/api/types';

const AUTH_ROUTES = ['/login', '/signup', '/onboarding', '/'];
const isAuthOrPublicRoute = (pathname: string | null): boolean => {
  if (!pathname) return true;
  if (AUTH_ROUTES.some((r) => pathname === r)) return true;
  if (pathname.startsWith('/callback')) return true;
  if (pathname.startsWith('/privacy') || pathname.startsWith('/terms') || pathname.startsWith('/contact')) return true;
  if (pathname.startsWith('/reset-password') || pathname.startsWith('/verify-email') || pathname.startsWith('/forgot-password')) return true;
  return false;
};

interface WebSocketContextType {
  isConnected: boolean;
  sendTypingIndicator: (matchId: string, isTyping: boolean) => void;
  sendMarkRead: (messageId: string) => void;
  subscribeToMessages: (matchId: string, callback: (message: Message) => void) => () => void;
  subscribeToDelivered: (matchId: string, callback: (messageId: string, deliveredAt: string | null) => void) => () => void;
  subscribeToRead: (matchId: string, callback: (messageId: string, readAt: string | null) => void) => () => void;
  subscribeToTyping: (matchId: string, callback: (isTyping: boolean, senderId: string) => void) => () => void;
  subscribeToNotifications: (callback: (data: { kind: string; match_id?: string }) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const wsClientRef = useRef<MessagingWebSocketClient | null>(null);
  const messageListenersRef = useRef<Map<string, Set<(message: Message) => void>>>(new Map());
  const deliveredListenersRef = useRef<Map<string, Set<(messageId: string, deliveredAt: string | null) => void>>>(new Map());
  const readListenersRef = useRef<Map<string, Set<(messageId: string, readAt: string | null) => void>>>(new Map());
  const typingListenersRef = useRef<Map<string, Set<(isTyping: boolean, senderId: string) => void>>>(new Map());
  const notificationListenersRef = useRef<Set<(data: { kind: string; match_id?: string }) => void>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user?.profile_id || isAuthOrPublicRoute(pathname)) {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Create WebSocket client
    const client = new MessagingWebSocketClient(user.profile_id);
    wsClientRef.current = client;

    // Set up event listeners
    client.on('connected', () => {
      if (process.env.NODE_ENV === 'development') console.log('WebSocket context: connection established, setting isConnected=true');
      setIsConnected(true);
    });

    client.on('disconnected', () => {
      setIsConnected(false);
    });

    client.on('new_message', (message: Message) => {
      if (process.env.NODE_ENV === 'development') console.log('WebSocket received new message:', message);
      // Auto-ack delivery for incoming messages
      if (message.sender_id !== user.profile_id) {
        client.sendDelivered(message.id);
      }
      // Notify all listeners for this match
      const listeners = messageListenersRef.current.get(message.match_id);
      if (listeners) {
        if (process.env.NODE_ENV === 'development') console.log(`Notifying ${listeners.size} listeners for match ${message.match_id}`);
        listeners.forEach((callback) => callback(message));
      } else {
        if (process.env.NODE_ENV === 'development') console.warn(`No listeners found for match ${message.match_id}`);
      }
    });

    client.on('message_delivered', (data: { match_id: string; message_id: string; delivered_at: string | null }) => {
      const listeners = deliveredListenersRef.current.get(data.match_id);
      listeners?.forEach((cb) => cb(data.message_id, data.delivered_at));
    });

    client.on('message_read', (data: { match_id: string; message_id: string; read_at: string | null }) => {
      const listeners = readListenersRef.current.get(data.match_id);
      listeners?.forEach((cb) => cb(data.message_id, data.read_at));
    });

    client.on('typing', (data: { matchId: string; senderId: string; isTyping: boolean }) => {
      const listeners = typingListenersRef.current.get(data.matchId);
      if (listeners) {
        listeners.forEach((callback) => callback(data.isTyping, data.senderId));
      }
    });

    client.on('notification', (data: { type: 'notification'; kind: string; match_id?: string }) => {
      notificationListenersRef.current.forEach((cb) => cb({ kind: data.kind, match_id: data.match_id }));
    });

    client.on('error', (data: { error: string }) => {
      if (process.env.NODE_ENV === 'development') console.error('WebSocket error:', data.error);
    });

    // Connect
    client.connect().catch((error) => {
      if (process.env.NODE_ENV === 'development') console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    });

    return () => {
      client.disconnect();
    };
  }, [isAuthenticated, user?.profile_id, pathname]);

  const sendTypingIndicator = (matchId: string, isTyping: boolean) => {
    if (wsClientRef.current?.isConnected) {
      wsClientRef.current.sendTypingIndicator(matchId, isTyping);
    }
  };

  const sendMarkRead = (messageId: string) => {
    if (wsClientRef.current?.isConnected) {
      wsClientRef.current.sendMarkRead(messageId);
    }
  };

  const subscribeToMessages = (matchId: string, callback: (message: Message) => void) => {
    if (process.env.NODE_ENV === 'development') console.log(`Subscribing to messages for match ${matchId}`);
    if (!messageListenersRef.current.has(matchId)) {
      messageListenersRef.current.set(matchId, new Set());
    }
    messageListenersRef.current.get(matchId)!.add(callback);

    // Return unsubscribe function
    return () => {
      messageListenersRef.current.get(matchId)?.delete(callback);
      if (process.env.NODE_ENV === 'development') console.log(`Unsubscribed from match ${matchId}`);
    };
  };

  const subscribeToDelivered = (matchId: string, callback: (messageId: string, deliveredAt: string | null) => void) => {
    if (!deliveredListenersRef.current.has(matchId)) {
      deliveredListenersRef.current.set(matchId, new Set());
    }
    deliveredListenersRef.current.get(matchId)!.add(callback);
    return () => {
      deliveredListenersRef.current.get(matchId)?.delete(callback);
    };
  };

  const subscribeToRead = (matchId: string, callback: (messageId: string, readAt: string | null) => void) => {
    if (!readListenersRef.current.has(matchId)) {
      readListenersRef.current.set(matchId, new Set());
    }
    readListenersRef.current.get(matchId)!.add(callback);
    return () => {
      readListenersRef.current.get(matchId)?.delete(callback);
    };
  };

  const subscribeToTyping = (matchId: string, callback: (isTyping: boolean, senderId: string) => void) => {
    if (!typingListenersRef.current.has(matchId)) {
      typingListenersRef.current.set(matchId, new Set());
    }
    typingListenersRef.current.get(matchId)!.add(callback);

    // Return unsubscribe function
    return () => {
      typingListenersRef.current.get(matchId)?.delete(callback);
    };
  };

  const subscribeToNotifications = (callback: (data: { kind: string; match_id?: string }) => void) => {
    notificationListenersRef.current.add(callback);
    return () => {
      notificationListenersRef.current.delete(callback);
    };
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendTypingIndicator,
        sendMarkRead,
        subscribeToMessages,
        subscribeToDelivered,
        subscribeToRead,
        subscribeToTyping,
        subscribeToNotifications,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

