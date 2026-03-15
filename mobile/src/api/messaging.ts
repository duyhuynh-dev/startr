import apiClient from './client';

export interface ConversationThread {
  match_id: string;
  founder_id: string;
  investor_id: string;
  other_party_id: string;
  other_party_name: string;
  other_party_avatar_url?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  status: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface MessageCreate {
  match_id: string;
  content: string;
}

export async function getConversations(): Promise<ConversationThread[]> {
  const res = await apiClient.get<ConversationThread[]>('/messages');
  return res.data;
}

export async function getMessages(matchId: string, limit = 50): Promise<Message[]> {
  const res = await apiClient.get<Message[]>(`/messages/${matchId}`, {
    params: { limit },
  });
  return res.data;
}

export async function sendMessage(payload: MessageCreate): Promise<Message> {
  const res = await apiClient.post<Message>('/messages', payload);
  return res.data;
}
