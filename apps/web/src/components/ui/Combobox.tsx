'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

type Option = { value: string; label: string };

export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seçin…',
  searchPlaceholder = 'Ara…',
  error,
  disabled,
  emptyText = 'Sonuç bulunamadı',
  allowCustom = false,
  customLabel = 'Özel değer kullan',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  emptyText?: string;
  allowCustom?: boolean;
  customLabel?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return options.slice(0, 80);
    return options
      .filter((o) => o.label.toLocaleLowerCase('tr').includes(q))
      .slice(0, 80);
  }, [options, query]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || value || '';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative block space-y-1.5">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-rf-secondary">
          {label}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full min-h-11 items-center justify-between rounded-xl border border-rf-border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus-visible:border-rf-primary focus-visible:ring-2 focus-visible:ring-rf-primary/20 disabled:opacity-60',
          error && 'border-rf-danger',
          !selectedLabel && 'text-rf-faint',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-rf-faint" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-rf-border bg-white shadow-lg">
          <div className="relative border-b border-rf-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rf-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-rf-border bg-rf-muted/40 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rf-primary"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto overscroll-contain py-1"
          >
            {filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-rf-muted',
                      active && 'bg-rf-primary-soft text-rf-primary',
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-rf-secondary">{emptyText}</li>
            ) : null}
            {allowCustom && query.trim() ? (
              <li className="border-t border-rf-border">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm font-medium text-rf-primary hover:bg-rf-primary-soft"
                  onClick={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {customLabel}: “{query.trim()}”
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {error ? <span className="text-xs text-rf-danger">{error}</span> : null}
    </div>
  );
}
