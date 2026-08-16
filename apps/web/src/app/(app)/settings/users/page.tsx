'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, UserX, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { settingsService } from '@/services/settingsService';
import { roleLabel, userStatusLabel } from '@/utils/labels';
import { formatDate } from '@/utils/date';
import { getErrorMessage } from '@/utils/errors';
import type { UserRole } from '@rentaflow/shared';

const ROLES: UserRole[] = ['owner', 'admin', 'manager', 'staff', 'viewer'];

const STATUS_TONE: Record<string, 'success' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  INVITED: 'info',
  SUSPENDED: 'neutral',
};

export default function UsersSettingsPage() {
  const { can, isLoading: permsLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ['organization-users'],
    queryFn: () => settingsService.listUsers(),
  });

  if (!permsLoading && !can('users.view')) {
    return (
      <EmptyState
        title="Yetkiniz yok"
        description="Kullanıcıları görüntüleme yetkiniz bulunmuyor."
        action={
          <Link href="/settings">
            <Button variant="secondary">Ayarlara Dön</Button>
          </Link>
        }
      />
    );
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['organization-users'] });
  }

  async function handleToggleStatus(
    userId: string,
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED',
  ) {
    setBusyId(userId);
    setActionError(null);
    try {
      await settingsService.setUserStatus(userId, status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
      await refresh();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Kullanıcı durumu güncellenemedi.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setBusyId(userId);
    setActionError(null);
    try {
      await settingsService.setUserRole(userId, role);
      await refresh();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Rol güncellenemedi.'));
    } finally {
      setBusyId(null);
    }
  }

  const items = users.data ?? [];

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        description="Ekip üyelerini davet edin ve yetkilerini yönetin."
        actions={
          <>
            <Link href="/settings">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Geri
              </Button>
            </Link>
            {can('users.invite') ? (
              <Button onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4" /> Kullanıcı Davet Et
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {users.isLoading ? <LoadingBlock /> : null}
      {users.isError ? (
        <ErrorBanner message={getErrorMessage(users.error, 'Kullanıcılar yüklenemedi.')} />
      ) : null}

      {!users.isLoading && !users.isError && items.length === 0 ? (
        <EmptyState title="Kullanıcı bulunamadı" description="Henüz davet edilen kullanıcı yok." />
      ) : null}

      {items.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">E-posta</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Son Giriş</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-3">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {can('users.invite') ? (
                      <Select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={busyId === u.id}
                        className="w-36 py-1.5 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      roleLabel(u.role)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[u.status] ?? 'neutral'}>
                      {userStatusLabel(u.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-rf-secondary">
                    {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('users.suspend') && u.status !== 'INVITED' ? (
                      <Button
                        variant="ghost"
                        className="text-xs"
                        loading={busyId === u.id}
                        onClick={() => handleToggleStatus(u.id, u.status)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        {u.status === 'ACTIVE' ? 'Askıya Al' : 'Etkinleştir'}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {inviteOpen ? (
        <InviteUserModal
          onClose={() => setInviteOpen(false)}
          onInvited={async () => {
            setInviteOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function InviteUserModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !fullName.trim()) {
      setError('Ad ve e-posta zorunludur.');
      return;
    }
    setSubmitting(true);
    try {
      await settingsService.inviteUser({ email: email.trim(), fullName: fullName.trim(), role });
      onInvited();
    } catch (err) {
      setError(getErrorMessage(err, 'Davet gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Kullanıcı Davet Et</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rf-secondary hover:bg-rf-muted"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <ErrorBanner message={error} /> : null}
          <Input label="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select label="Rol" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ROLES.filter((r) => r !== 'owner').map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" loading={submitting}>
              Davet Gönder
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
