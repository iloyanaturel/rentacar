import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-rf-border bg-rf-surface p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-rf-muted text-rf-secondary',
    success: 'bg-rf-success-soft text-rf-success',
    warning: 'bg-rf-warning-soft text-rf-warning',
    danger: 'bg-rf-danger-soft text-rf-danger',
    info: 'bg-rf-info-soft text-rf-info',
    primary: 'bg-rf-primary-soft text-rf-primary',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-rf-text md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-rf-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rf-border bg-white px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-rf-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-rf-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-rf-border bg-white px-6 py-16 text-sm text-rf-secondary">
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rf-danger/20 bg-rf-danger-soft px-4 py-3 text-sm text-rf-danger"
    >
      {message}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-rf-faint">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-rf-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-rf-secondary">{hint}</p> : null}
    </Card>
  );
}
