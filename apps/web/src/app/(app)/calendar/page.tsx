'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Select,
} from '@/components/ui';
import {
  calendarService,
  getRangeForView,
  findVehicleOverlaps,
  type CalendarViewMode,
} from '@/services/calendarService';
import { formatFriendlyDate } from '@/utils/date';
import { rentalStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';

type RentalStatusLabelInput = Parameters<typeof rentalStatusLabel>[0];

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'danger'> = {
  RESERVED: 'info',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  OVERDUE: 'danger',
};

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function toIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildDays(anchor: Date, mode: CalendarViewMode): Date[] {
  if (mode === 'week') {
    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const leading = startDay === 0 ? 6 : startDay - 1;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - leading);
  const totalCells = Math.ceil((leading + monthEnd.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [mode, setMode] = useState<CalendarViewMode>('week');

  const range = useMemo(() => getRangeForView(anchor, mode), [anchor, mode]);

  const query = useQuery({
    queryKey: ['calendar-rentals', range.from, range.to],
    queryFn: () => calendarService.getRentals({ from: range.from, to: range.to }),
  });

  const events = useMemo(() => query.data ?? [], [query.data]);
  const overlaps = useMemo(() => findVehicleOverlaps(events), [events]);
  const days = useMemo(() => buildDays(anchor, mode), [anchor, mode]);

  function shift(delta: number) {
    const next = new Date(anchor);
    if (mode === 'week') next.setDate(anchor.getDate() + delta * 7);
    else next.setMonth(anchor.getMonth() + delta);
    setAnchor(next);
  }

  function eventsForDay(iso: string) {
    return events.filter((e) => e.start_date <= iso && e.end_date >= iso);
  }

  const currentMonth = anchor.getMonth();

  return (
    <div>
      <PageHeader
        title="Takvim"
        description="Kiralamaları haftalık veya aylık görünümde inceleyin."
        actions={
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as CalendarViewMode)}
            className="w-40"
          >
            <option value="week">Haftalık</option>
            <option value="month">Aylık</option>
          </Select>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="font-display text-lg font-semibold">
              {formatFriendlyDate(anchor)} {mode === 'month' ? anchor.getFullYear() : ''}
            </p>
            <button
              className="text-xs font-medium text-rf-primary"
              onClick={() => setAnchor(new Date())}
            >
              Bugüne dön
            </button>
          </div>
          <Button variant="secondary" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorBanner message={getErrorMessage(query.error, 'Takvim verileri yüklenemedi.')} />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <div className="overflow-x-auto">
          <div
            className={`grid min-w-[840px] gap-2 ${
              mode === 'week' ? 'grid-cols-7' : 'grid-cols-7'
            }`}
          >
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-1 text-center text-xs font-semibold uppercase text-rf-faint">
                {label}
              </div>
            ))}
            {days.map((day) => {
              const iso = toIso(day);
              const dayEvents = eventsForDay(iso);
              const isToday = iso === toIso(new Date());
              const isOtherMonth = mode === 'month' && day.getMonth() !== currentMonth;
              return (
                <Card
                  key={iso}
                  className={`min-h-[120px] p-2 ${isOtherMonth ? 'opacity-40' : ''} ${
                    isToday ? 'ring-2 ring-rf-primary' : ''
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold text-rf-secondary">
                    {day.getDate()}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 4).map((ev) => (
                      <Link
                        key={ev.rental_id}
                        href={`/rentals/${ev.rental_id}`}
                        className="block rounded-lg bg-rf-muted px-2 py-1 text-[11px] leading-tight hover:bg-rf-primary-soft"
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          {overlaps.has(ev.rental_id) ? (
                            <AlertTriangle className="h-3 w-3 text-rf-danger" />
                          ) : null}
                          {ev.plate}
                        </span>
                        <span className="text-rf-secondary">{ev.customer_name}</span>
                      </Link>
                    ))}
                    {dayEvents.length > 4 ? (
                      <p className="text-[11px] text-rf-faint">
                        +{dayEvents.length - 4} daha
                      </p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <Card className="mt-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Bu Aralıktaki Kiralamalar</h2>
        {events.length === 0 ? (
          <p className="text-sm text-rf-secondary">Bu tarih aralığında kiralama yok.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.rental_id}>
                <Link
                  href={`/rentals/${ev.rental_id}`}
                  className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-rf-muted"
                >
                  <div className="flex items-center gap-2">
                    {overlaps.has(ev.rental_id) ? (
                      <AlertTriangle className="h-4 w-4 text-rf-danger" />
                    ) : null}
                    <div>
                      <p className="text-sm font-medium">
                        {ev.plate} · {ev.customer_name}
                      </p>
                      <p className="text-xs text-rf-secondary">
                        {ev.start_date} — {ev.end_date}
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[ev.display_status] ?? 'neutral'}>
                    {rentalStatusLabel(ev.display_status as RentalStatusLabelInput)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
