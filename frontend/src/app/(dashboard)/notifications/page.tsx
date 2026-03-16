/**
 * Notifications – in-app notification center
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification } from '@/lib/api/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setItems(res.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (n: Notification) => {
    if (n.read_at) return;
    try {
      const updated = await notificationsApi.markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      // non-blocking
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      await load();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Notifications</h1>
            <p className="text-sm text-white/40 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll || items.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-white/10 text-white/70 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark all read
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-white/40">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
            <p className="text-sm text-white/50">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Wrapper: any = n.href ? Link : 'div';
              const wrapperProps = n.href
                ? { href: n.href, onClick: () => markRead(n) }
                : { onClick: () => markRead(n) };

              return (
                <Wrapper
                  key={n.id}
                  {...wrapperProps}
                  className={`block rounded-2xl border px-4 py-3 transition-colors ${
                    n.read_at ? 'border-white/10 bg-white/5' : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{n.title}</p>
                      {n.body && <p className="text-sm text-white/50 mt-1 break-words">{n.body}</p>}
                      <p className="text-xs text-white/40 mt-2">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span className="mt-1 inline-flex w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
