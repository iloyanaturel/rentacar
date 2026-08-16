'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
} from '@/components/ui';
import {
  notificationDeepLink,
  notificationService,
} from '@/services/notificationService';
import { formatDate, formatTime } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
  });

  const items = query.data ?? [];
  const unreadCount = items.filter((n) => !n.is_read).length;

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await notificationService.markAsRead([id]);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bildirimler"
        description={
          unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu.'
        }
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={handleMarkAll} loading={markingAll}>
              <CheckCheck className="h-4 w-4" /> Tümünü Okundu İşaretle
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorBanner message={getErrorMessage(query.error, 'Bildirimler yüklenemedi.')} />
      ) : null}

      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState
          title="Bildirim yok"
          description="Yeni bildirimler burada görünecek."
        />
      ) : null}

      {items.length > 0 ? (
        <Card className="p-0">
          <ul>
            {items.map((n) => {
              const link = notificationDeepLink(n);
              const content = (
                <div className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      n.is_read ? 'bg-rf-muted text-rf-faint' : 'bg-rf-primary-soft text-rf-primary'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-rf-text">{n.title}</p>
                      {!n.is_read ? <Badge tone="primary">Yeni</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-sm text-rf-secondary">{n.message}</p>
                    <p className="mt-1 text-xs text-rf-faint">
                      {formatDate(n.created_at)} · {formatTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read ? (
                    <Button
                      variant="ghost"
                      className="text-xs"
                      loading={busyId === n.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleMarkRead(n.id);
                      }}
                      aria-label="Okundu işaretle"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              );
              return (
                <li key={n.id} className="border-b border-rf-border last:border-0">
                  {link ? (
                    <Link href={link} className="block hover:bg-rf-muted">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
