'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  Car,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  Wallet,
  Wrench,
  X,
  LogOut,
  FileBarChart2,
  Receipt,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Parameters<ReturnType<typeof usePermissions>['can']>[0];
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Özet', icon: LayoutDashboard },
  { href: '/calendar', label: 'Takvim', icon: CalendarDays },
  { href: '/vehicles', label: 'Araçlar', icon: Car, permission: 'vehicles.view' },
  { href: '/rentals', label: 'Kiralamalar', icon: ClipboardList, permission: 'rentals.view' },
  { href: '/customers', label: 'Müşteriler', icon: Users, permission: 'customers.view' },
  { href: '/payments', label: 'Ödemeler', icon: Wallet, permission: 'payments.view' },
  { href: '/expenses', label: 'Masraflar', icon: Receipt, permission: 'expenses.view' },
  { href: '/maintenance', label: 'Bakım', icon: Wrench, permission: 'maintenance.view' },
  { href: '/reports', label: 'Raporlar', icon: FileBarChart2, permission: 'reports.view' },
  { href: '/notifications', label: 'Bildirimler', icon: Bell },
  { href: '/settings', label: 'Ayarlar', icon: Settings, permission: 'settings.view' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, organization, profile, signOut } = useAuth();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rf-bg text-sm text-rf-secondary">
        Oturum kontrol ediliyor…
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  const items = NAV.filter((item) => !item.permission || can(item.permission));

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="border-b border-rf-border px-5 py-5">
        <p className="font-display text-xl font-bold text-rf-primary">RentaFlow</p>
        <p className="mt-1 truncate text-xs text-rf-secondary">
          {organization?.name ?? 'Organizasyon'}
        </p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-rf-primary text-white'
                  : 'text-rf-secondary hover:bg-rf-muted hover:text-rf-text',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-rf-border p-4">
        <p className="truncate text-sm font-medium text-rf-text">
          {profile?.full_name ?? 'Kullanıcı'}
        </p>
        <p className="truncate text-xs text-rf-faint">{profile?.role}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/profile" className="flex-1">
            <Button variant="secondary" className="w-full text-xs">
              Profil
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="px-3"
            onClick={() => void signOut().then(() => router.replace('/login'))}
            aria-label="Çıkış"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-rf-bg lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-rf-border bg-white lg:block">
        {nav}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-xl">
            <button
              className="absolute right-3 top-3 rounded-lg p-2 text-rf-secondary"
              onClick={() => setOpen(false)}
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-rf-border bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            className="rounded-lg p-2 text-rf-text hover:bg-rf-muted"
            onClick={() => setOpen(true)}
            aria-label="Menü"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-display text-lg font-bold text-rf-primary">RentaFlow</p>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
