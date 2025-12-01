/**
 * WebSocket client for real-time messaging
 */

import type { WebSocketMessage } from '@/hooks/useWebSocket';

import { DEFAULT_WS_BASE_URL, STORAGE_KEYS, WS_PING_INTERVAL_MS, WS_MAX_RECONNECT_DELAY_MS } from '../constants';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_BASE_URL;

export function getWebSocketUrl(profileId: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) : null;
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${WS_BASE_URL}/${profileId}${tokenParam}`;
}

export interface NewMessagePayload {
  type: 'new_message';
  message: {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    attachment_url?: string;
    read_at?: string;
    created_at: string;
  };
}

export interface TypingIndicatorPayload {
  type: 'typing';
  match_id: string;
  sender_id: string;
  is_typing: boolean;
}

export interface ConnectedPayload {
  type: 'connected';
  profile_id: string;
  message: string;
}

export interface OnlineStatusPayload {
  type: 'online_status';
  profile_id: string;
  is_online: boolean;
}

export type MessagingWebSocketMessage =
  | NewMessagePayload
  | TypingIndicatorPayload
  | ConnectedPayload
  | OnlineStatusPayload
  | { type: 'error'; message: string }
  | { type: 'pong'; timestamp: string };

export class MessagingWebSocketClient {
  private ws: WebSocket | null = null;
  private profileId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(profileId: string) {
    this.profileId = profileId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const url = getWebSocketUrl(this.profileId);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully for profile:', this.profileId);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected', {});
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('WebSocket received raw message:', event.data);
          const message = JSON.parse(event.data) as MessagingWebSocketMessage;
          console.log('WebSocket parsed message:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.stopHeartbeat();
        this.emit('disconnected', {});
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.emit('error', { error });
        reject(error);
      };
    });
  }

  private handleMessage(message: MessagingWebSocketMessage) {
    console.log('Handling WebSocket message type:', message.type, message);
    switch (message.type) {
      case 'new_message':
        console.log('Emitting new_message event:', message.message);
        this.emit('new_message', message.message);
        break;
      case 'typing':
        this.emit('typing', {
          matchId: message.match_id,
          senderId: message.sender_id,
          isTyping: message.is_typing,
        });
        break;
      case 'online_status':
        this.emit('online_status', {
          profileId: message.profile_id,
          isOnline: message.is_online,
        });
        break;
      case 'connected':
        this.emit('connected', {});
        break;
      case 'error':
        this.emit('error', { error: message.message });
        break;
      case 'pong':
        // Heartbeat response - no action needed
        break;
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_PING_INTERVAL_MS); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), WS_MAX_RECONNECT_DELAY_MS); // Exponential backoff, max 30s

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  sendTypingIndicator(matchId: string, isTyping: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'typing',
          match_id: matchId,
          is_typing: isTyping,
        })
      );
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    this.listeners.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

