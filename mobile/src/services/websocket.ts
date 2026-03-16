import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../config';

function deriveWsUrl(profileId: string, token: string): string {
  try {
    const u = new URL(API_BASE_URL);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    const m = u.pathname.match(/\/api\/v(\d+)\/?$/);
    if (m?.[1]) {
      u.pathname = `/api/v${m[1]}/realtime/ws/${profileId}`;
    } else {
      u.pathname = `${u.pathname.replace(/\/$/, '')}/realtime/ws/${profileId}`;
    }
    u.search = `?token=${encodeURIComponent(token)}`;
    return u.toString();
  } catch {
    return `ws://localhost:8012/api/v1/realtime/ws/${profileId}?token=${encodeURIComponent(token)}`;
  }
}

export type WSEventType =
  | 'connected'
  | 'disconnected'
  | 'new_message'
  | 'message_delivered'
  | 'message_read'
  | 'typing'
  | 'online_status'
  | 'notification'
  | 'error';

type Listener = (data: any) => void;

export class MobileWebSocketClient {
  private ws: WebSocket | null = null;
  private profileId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Map<string, Set<Listener>>();

  constructor(profileId: string) {
    this.profileId = profileId;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    const url = deriveWsUrl(this.profileId, token);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch {}
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.emit('disconnected', {});
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.emit('error', { message: 'WebSocket error' });
    };
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'new_message':
        this.emit('new_message', msg.message);
        if (msg.message?.id) this.sendDelivered(msg.message.id);
        break;
      case 'message_delivered':
        this.emit('message_delivered', msg);
        break;
      case 'message_read':
        this.emit('message_read', msg);
        break;
      case 'typing':
        this.emit('typing', { matchId: msg.match_id, senderId: msg.sender_id, isTyping: msg.is_typing });
        break;
      case 'online_status':
        this.emit('online_status', { profileId: msg.profile_id, isOnline: msg.is_online });
        break;
      case 'notification':
        this.emit('notification', msg);
        break;
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimeout = setTimeout(() => { this.connect().catch(() => {}); }, delay);
  }

  sendTyping(matchId: string, isTyping: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing', match_id: matchId, is_typing: isTyping }));
    }
  }

  sendDelivered(messageId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'delivered', message_id: messageId }));
    }
  }

  sendMarkRead(messageId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'mark_read', message_id: messageId }));
    }
  }

  on(event: string, cb: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: string, cb: Listener) {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => { try { cb(data); } catch {} });
  }

  disconnect() {
    if (this.reconnectTimeout) { clearTimeout(this.reconnectTimeout); this.reconnectTimeout = null; }
    this.stopHeartbeat();
    this.listeners.clear();
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  get isConnected() { return this.ws?.readyState === WebSocket.OPEN; }
}
