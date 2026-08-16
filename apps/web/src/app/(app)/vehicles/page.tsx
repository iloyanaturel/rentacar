'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
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
import { vehiclesService } from '@/services/vehiclesService';
import { VEHICLE_STATUS_FILTERS } from '@/features/vehicles/constants';
import { formatCurrency } from '@/utils/currency';
import { vehicleStatusLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import type { VehicleStatus } from '@rentaflow/shared';

const STATUS_TONE: Record<VehicleStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  AVAILABLE: 'success',
  RENTED: 'info',
  MAINTENANCE: 'warning',
  INACTIVE: 'neutral',
};

export default function VehiclesPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VehicleStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['vehicles', { search, status, page }],
    queryFn: () => vehiclesService.getVehicles({ search, status, page }),
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Araçlar"
        description="Filonuzdaki tüm araçları görüntüleyin ve yönetin."
        actions={
          can('vehicles.create') ? (
            <Link href="/vehicles/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4" /> Araç Ekle
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rf-faint" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Plaka, marka veya model ara…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:contents">
            {VEHICLE_STATUS_FILTERS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatus(opt.value);
                    setPage(0);
                  }}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition sm:hidden ${
                    active
                      ? 'bg-rf-primary text-white'
                      : 'bg-rf-muted text-rf-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as VehicleStatus | 'ALL');
              setPage(0);
            }}
            className="hidden sm:block sm:w-56"
          >
            {VEHICLE_STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {query.isLoading ? <LoadingBlock /> : null}

      {query.isError ? (
        <ErrorBanner message={getErrorMessage(query.error, 'Araçlar yüklenemedi.')} />
      ) : null}

      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState
          title="Araç bulunamadı"
          description="Arama kriterlerinizi değiştirin veya yeni bir araç ekleyin."
          action={
            can('vehicles.create') ? (
              <Link href="/vehicles/new">
                <Button>Araç Ekle</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {!query.isLoading && !query.isError && items.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((v) => (
              <Link key={v.id} href={`/vehicles/${v.id}`} className="block">
                <Card className="transition hover:border-rf-primary/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold text-rf-primary">
                        {v.plate}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-rf-text">
                        {v.brand} {v.model}
                        {v.model_year ? (
                          <span className="text-rf-faint"> · {v.model_year}</span>
                        ) : null}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[v.status]}>
                      {vehicleStatusLabel(v.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-rf-secondary">
                    <span>{v.current_km.toLocaleString('tr-TR')} km</span>
                    <span className="font-semibold text-rf-text">
                      {formatCurrency(v.daily_price)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                  <th className="px-4 py-3">Plaka</th>
                  <th className="px-4 py-3">Marka / Model</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Kilometre</th>
                  <th className="px-4 py-3">Günlük Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-rf-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/vehicles/${v.id}`}
                        className="font-semibold text-rf-primary hover:underline"
                      >
                        {v.plate}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {v.brand} {v.model}
                      {v.model_year ? (
                        <span className="ml-1 text-rf-faint">({v.model_year})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[v.status]}>
                        {vehicleStatusLabel(v.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {v.current_km.toLocaleString('tr-TR')} km
                    </td>
                    <td className="px-4 py-3">{formatCurrency(v.daily_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}

      {query.data && (query.data.total > query.data.pageSize || page > 0) ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rf-secondary">
            Toplam {query.data.total} araç · Sayfa {page + 1}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Önceki
            </Button>
            <Button
              variant="secondary"
              disabled={!query.data.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
