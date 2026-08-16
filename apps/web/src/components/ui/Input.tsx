import { cn } from '@/lib/cn';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Input({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-rf-secondary">{label}</span>
      ) : null}
      <input
        className={cn(
          'w-full min-h-11 rounded-xl border border-rf-border bg-white px-3.5 py-2.5 text-sm text-rf-text outline-none transition placeholder:text-rf-faint focus:border-rf-primary focus:ring-2 focus:ring-rf-primary/20',
          error && 'border-rf-danger focus:border-rf-danger focus:ring-rf-danger/20',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rf-danger">{error}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-rf-secondary">{label}</span>
      ) : null}
      <textarea
        className={cn(
          'w-full rounded-xl border border-rf-border bg-white px-3.5 py-2.5 text-sm text-rf-text outline-none transition placeholder:text-rf-faint focus:border-rf-primary focus:ring-2 focus:ring-rf-primary/20',
          error && 'border-rf-danger',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rf-danger">{error}</span> : null}
    </label>
  );
}

export function Select({
  label,
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-rf-secondary">{label}</span>
      ) : null}
      <select
        className={cn(
          'w-full min-h-11 rounded-xl border border-rf-border bg-white px-3.5 py-2.5 text-sm text-rf-text outline-none transition focus:border-rf-primary focus:ring-2 focus:ring-rf-primary/20',
          error && 'border-rf-danger',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-rf-danger">{error}</span> : null}
    </label>
  );
}
