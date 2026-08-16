'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { vehiclesService } from '@/services/vehiclesService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { rentalStatusLabel, vehicleStatusLabel } from '@/utils/labels';
import { fuelLabel, transmissionLabel } from '@/utils/plate';
import { getExpiryStatus } from '@/utils/expiry';
import { getErrorMessage } from '@/utils/errors';
import type { VehicleStatus } from '@rentaflow/shared';

const STATUS_TONE: Record<VehicleStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  AVAILABLE: 'success',
  RENTED: 'info',
  MAINTENANCE: 'warning',
  INACTIVE: 'neutral',
};

const EXPIRY_TONE = {
  ok: 'success',
  warning: 'warning',
  critical: 'danger',
  expired: 'danger',
  none: 'neutral',
} as const;

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const vehicle = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesService.getVehicle(id),
  });
  const stats = useQuery({
    queryKey: ['vehicle-stats', id],
    queryFn: () => vehiclesService.getVehicleStats(id),
  });
  const rentals = useQuery({
    queryKey: ['vehicle-rentals', id],
    queryFn: () => vehiclesService.getVehicleRentals(id),
  });

  if (vehicle.isLoading) return <LoadingBlock />;
  if (vehicle.isError || !vehicle.data) {
    return (
      <EmptyState
        title="Araç bulunamadı"
        description={getErrorMessage(vehicle.error, 'Araç bilgileri yüklenemedi.')}
        action={
          <Link href="/vehicles">
            <Button variant="secondary">Araçlara Dön</Button>
          </Link>
        }
      />
    );
  }

  const v = vehicle.data;

  async function handleArchive() {
    if (!window.confirm(`${v.plate} plakalı aracı pasife almak istediğinize emin misiniz?`)) {
      return;
    }
    setArchiving(true);
    setActionError(null);
    try {
      await vehiclesService.archiveVehicle(id);
      await queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (error) {
      setActionError(getErrorMessage(error, 'Araç pasife alınamadı.'));
    } finally {
      setArchiving(false);
    }
  }

  const documents = [
    { label: 'Sigorta', value: v.insurance_expiry },
    { label: 'Kasko', value: v.casco_expiry },
    { label: 'Muayene', value: v.inspection_expiry },
  ];

  return (
    <div>
      <PageHeader
        title={`${v.brand} ${v.model}`}
        description={v.plate}
        actions={
          <>
            <Link href="/vehicles">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Geri
              </Button>
            </Link>
            {can('vehicles.update') ? (
              <Link href={`/vehicles/${id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" /> Düzenle
                </Button>
              </Link>
            ) : null}
            {can('vehicles.delete') && v.status !== 'RENTED' ? (
              <Button variant="danger" onClick={handleArchive} loading={archiving}>
                <Trash2 className="h-4 w-4" /> Pasife Al
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[v.status]}>{vehicleStatusLabel(v.status)}</Badge>
        <span className="text-sm text-rf-secondary">
          {fuelLabel(v.fuel_type)} · {transmissionLabel(v.transmission)}
        </span>
        {v.model_year ? (
          <span className="text-sm text-rf-secondary">Model {v.model_year}</span>
        ) : null}
      </div>

      {stats.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Toplam Kiralama" value={stats.data.rental_count} />
          <StatCard
            label="Toplam Tahsilat"
            value={formatCurrency(stats.data.total_collected_amount)}
          />
          <StatCard
            label="Net Kazanç"
            value={formatCurrency(stats.data.gross_contribution)}
          />
          <StatCard
            label="Bu Ay Doluluk"
            value={`%${Math.round(Number(stats.data.month_utilization_rate ?? 0))}`}
            hint={`${stats.data.month_rented_days}/${stats.data.month_days} gün`}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Araç Bilgileri</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-rf-faint">Renk</dt>
              <dd className="font-medium">{v.color ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Güncel Kilometre</dt>
              <dd className="font-medium">{v.current_km.toLocaleString('tr-TR')} km</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Günlük Fiyat</dt>
              <dd className="font-medium">{formatCurrency(v.daily_price)}</dd>
            </div>
            <div>
              <dt className="text-rf-faint">Depozito</dt>
              <dd className="font-medium">{formatCurrency(v.deposit_amount)}</dd>
            </div>
          </dl>
          {v.notes ? (
            <p className="mt-3 rounded-xl bg-rf-muted px-3 py-2 text-sm text-rf-secondary">
              {v.notes}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Belgeler</h2>
          <ul className="space-y-2">
            {documents.map((doc) => {
              const expiry = getExpiryStatus(doc.value);
              return (
                <li
                  key={doc.label}
                  className="flex items-center justify-between rounded-xl bg-rf-muted px-3 py-2 text-sm"
                >
                  <span>{doc.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-rf-secondary">{expiry.dateLabel}</span>
                    <Badge tone={EXPIRY_TONE[expiry.level]}>{expiry.label}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Kiralama Geçmişi</h2>
          {can('rentals.create') && v.status === 'AVAILABLE' ? (
            <Link
              href={`/rentals/new?vehicleId=${id}`}
              className="text-sm font-medium text-rf-primary"
            >
              Kiralama Oluştur
            </Link>
          ) : null}
        </div>
        {rentals.isLoading ? (
          <LoadingBlock />
        ) : (rentals.data ?? []).length === 0 ? (
          <p className="text-sm text-rf-secondary">Bu araç için kiralama kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                  <th className="py-2">Müşteri</th>
                  <th className="py-2">Tarihler</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {(rentals.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-rf-border last:border-0">
                    <td className="py-2">
                      <Link href={`/rentals/${r.id}`} className="font-medium text-rf-primary hover:underline">
                        {r.customer_name}
                      </Link>
                    </td>
                    <td className="py-2 text-rf-secondary">
                      {formatDate(r.start_date)} – {formatDate(r.end_date)}
                    </td>
                    <td className="py-2">{rentalStatusLabel(r.status)}</td>
                    <td className="py-2">{formatCurrency(r.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
