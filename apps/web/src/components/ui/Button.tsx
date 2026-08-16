import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
  primary:
    'bg-rf-primary text-white hover:bg-rf-primary-pressed disabled:opacity-60',
  secondary:
    'bg-white text-rf-text border border-rf-border hover:bg-rf-muted disabled:opacity-60',
  ghost: 'bg-transparent text-rf-primary hover:bg-rf-primary-soft disabled:opacity-60',
  danger: 'bg-rf-danger text-white hover:bg-red-700 disabled:opacity-60',
};

export function Button({
  children,
  className,
  variant = 'primary',
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-primary/40',
        styles[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Lütfen bekleyin…' : children}
    </button>
  );
}
