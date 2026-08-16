'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
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
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import {
  maintenanceService,
  type MaintenanceStatus,
} from '@/services/maintenanceService';
import { vehiclesService } from '@/services/vehiclesService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { maintenanceStatusLabel, maintenanceTypeLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import type { MaintenanceType } from '@rentaflow/shared';

const TYPES: MaintenanceType[] = [
  'PERIODIC',
  'OIL_CHANGE',
  'TIRES',
  'BRAKES',
  'BATTERY',
  'INSPECTION',
  'OTHER',
];

const STATUS_FILTERS: { value: MaintenanceStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'SCHEDULED', label: 'Planlandı' },
  { value: 'IN_PROGRESS', label: 'Devam ediyor' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' },
];

const STATUS_TONE: Record<MaintenanceStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export default function MaintenancePage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MaintenanceStatus | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const maintenances = useQuery({
    queryKey: ['maintenances', status],
    queryFn: () =>
      maintenanceService.getMaintenances(status === 'ALL' ? undefined : { status }),
  });
  const vehicles = useQuery({
    queryKey: ['maintenance-vehicle-picker'],
    queryFn: () => vehiclesService.getVehicles({ pageSize: 100 }),
    enabled: modalOpen,
  });

  const items = maintenances.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['maintenances'] });
  }

  async function handleStart(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await maintenanceService.startMaintenance(id);
      await refresh();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Bakım başlatılamadı.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await maintenanceService.completeMaintenance(id);
      await refresh();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Bakım tamamlanamadı.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm('Bu bakım kaydını iptal etmek istediğinize emin misiniz?')) return;
    setBusyId(id);
    setActionError(null);
    try {
      await maintenanceService.cancelMaintenance(id);
      await refresh();
    } catch (error) {
      setActionError(getErrorMessage(error, 'Bakım iptal edilemedi.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bakım"
        description="Araç bakım planlarını ve kayıtlarını yönetin."
        actions={
          can('maintenance.create') ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Bakım Kaydı Ekle
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value as MaintenanceStatus | 'ALL')} className="sm:w-56">
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Card>

      {actionError ? <ErrorBanner message={actionError} /> : null}

      {maintenances.isLoading ? <LoadingBlock /> : null}
      {maintenances.isError ? (
        <ErrorBanner message={getErrorMessage(maintenances.error, 'Bakım kayıtları yüklenemedi.')} />
      ) : null}

      {!maintenances.isLoading && !maintenances.isError && items.length === 0 ? (
        <EmptyState title="Bakım kaydı bulunamadı" description="Henüz kayıtlı bir bakım yok." />
      ) : null}

      {items.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Araç</th>
                <th className="px-4 py-3">Tür</th>
                <th className="px-4 py-3">Planlanan Tarih</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3">
                    {m.vehicle_plate ?? '—'}
                    <p className="text-xs text-rf-faint">
                      {m.vehicle_brand} {m.vehicle_model}
                    </p>
                  </td>
                  <td className="px-4 py-3">{maintenanceTypeLabel(m.maintenance_type)}</td>
                  <td className="px-4 py-3">{formatDate(m.scheduled_date)}</td>
                  <td className="px-4 py-3">{formatCurrency(m.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[m.status]}>{maintenanceStatusLabel(m.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('maintenance.update') && m.status === 'SCHEDULED' ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          className="text-xs"
                          loading={busyId === m.id}
                          onClick={() => handleStart(m.id)}
                        >
                          Başlat
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs"
                          loading={busyId === m.id}
                          onClick={() => handleCancel(m.id)}
                        >
                          İptal
                        </Button>
                      </div>
                    ) : null}
                    {can('maintenance.update') && m.status === 'IN_PROGRESS' ? (
                      <Button
                        variant="secondary"
                        className="text-xs"
                        loading={busyId === m.id}
                        onClick={() => handleComplete(m.id)}
                      >
                        Tamamla
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {modalOpen ? (
        <NewMaintenanceModal
          vehicles={vehicles.data?.items ?? []}
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function NewMaintenanceModal({
  vehicles,
  onClose,
  onCreated,
}: {
  vehicles: { id: string; plate: string; brand: string; model: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('PERIODIC');
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceName, setServiceName] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vehicleId) {
      setError('Bir araç seçmelisiniz.');
      return;
    }
    if (!scheduledDate) {
      setError('Planlanan tarihi seçmelisiniz.');
      return;
    }
    setSubmitting(true);
    try {
      await maintenanceService.createMaintenance({
        vehicleId,
        maintenanceType,
        title: title.trim() || undefined,
        scheduledDate,
        serviceName: serviceName.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        odometer: odometer ? Number(odometer) : undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Bakım kaydı oluşturulamadı.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Yeni Bakım Kaydı</h2>
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
          <Select label="Araç" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Araç seçin</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.brand} {v.model}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Bakım Türü"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {maintenanceTypeLabel(t)}
                </option>
              ))}
            </Select>
            <Input
              label="Planlanan Tarih"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            <Input label="Başlık (opsiyonel)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              label="Servis Adı (opsiyonel)"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
            <Input
              label="Tahmini Tutar (₺)"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <Input
              label="Kilometre (opsiyonel)"
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
          <TextArea label="Notlar (opsiyonel)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" loading={submitting}>
              Kaydet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
