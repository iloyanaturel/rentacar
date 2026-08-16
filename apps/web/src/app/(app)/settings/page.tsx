'use client';

import Link from 'next/link';
import { Building2, ChevronRight, SlidersHorizontal, Users } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';

const LINKS = [
  {
    href: '/settings/business',
    title: 'İşletme Bilgileri',
    description: 'Organizasyon adı, iletişim ve vergi bilgileri.',
    icon: Building2,
    permission: 'settings.view' as const,
  },
  {
    href: '/settings/rental',
    title: 'Kiralama Ayarları',
    description: 'Varsayılan depozito, kilometre limiti ve sözleşme metni.',
    icon: SlidersHorizontal,
    permission: 'settings.view' as const,
  },
  {
    href: '/settings/users',
    title: 'Kullanıcılar',
    description: 'Ekip üyelerini davet edin ve rollerini yönetin.',
    icon: Users,
    permission: 'users.view' as const,
  },
];

export default function SettingsHubPage() {
  const { can, isLoading } = usePermissions();

  const visible = LINKS.filter((l) => isLoading || can(l.permission));

  if (!isLoading && visible.length === 0) {
    return (
      <EmptyState title="Yetkiniz yok" description="Ayarları görüntüleme yetkiniz bulunmuyor." />
    );
  }

  return (
    <div>
      <PageHeader title="Ayarlar" description="Organizasyon ve kiralama ayarlarınızı yönetin." />

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="flex items-center gap-4 transition hover:border-rf-primary/40 hover:shadow-md">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rf-primary-soft text-rf-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-base font-semibold text-rf-text">
                    {link.title}
                  </p>
                  <p className="text-sm text-rf-secondary">{link.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-rf-faint" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
