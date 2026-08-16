'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
  TextArea,
} from '@/components/ui';
import { usePermissions } from '@/features/auth/usePermissions';
import { expenseService } from '@/services/expenseService';
import { vehiclesService } from '@/services/vehiclesService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { expenseCategoryLabel } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';
import type { ExpenseCategory } from '@rentaflow/shared';

const CATEGORIES: ExpenseCategory[] = [
  'MAINTENANCE',
  'FUEL',
  'INSURANCE',
  'CASCO',
  'TAX',
  'TIRES',
  'REPAIR',
  'CLEANING',
  'TOLL',
  'PARKING',
  'OTHER',
];

export default function ExpensesPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const expenses = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseService.getExpenses(),
  });
  const vehicles = useQuery({
    queryKey: ['expense-vehicle-picker'],
    queryFn: () => vehiclesService.getVehicles({ pageSize: 100 }),
    enabled: modalOpen,
  });

  const items = expenses.data ?? [];
  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div>
      <PageHeader
        title="Masraflar"
        description="Filo masraflarını kaydedin ve takip edin."
        actions={
          can('expenses.create') ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Masraf Ekle
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Toplam Kayıt" value={items.length} />
        <StatCard label="Toplam Tutar" value={formatCurrency(totalAmount)} />
      </div>

      {expenses.isLoading ? <LoadingBlock /> : null}
      {expenses.isError ? (
        <ErrorBanner message={getErrorMessage(expenses.error, 'Masraflar yüklenemedi.')} />
      ) : null}

      {!expenses.isLoading && !expenses.isError && items.length === 0 ? (
        <EmptyState
          title="Masraf bulunamadı"
          description="Henüz kayıtlı bir masraf yok."
          action={
            can('expenses.create') ? (
              <Button onClick={() => setModalOpen(true)}>Masraf Ekle</Button>
            ) : undefined
          }
        />
      ) : null}

      {items.length > 0 ? (
        <Card className="mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Araç</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Açıklama</th>
                <th className="px-4 py-3">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3">{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-3">{e.vehicle_plate ?? '—'}</td>
                  <td className="px-4 py-3">{expenseCategoryLabel(e.category)}</td>
                  <td className="px-4 py-3">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {modalOpen ? (
        <NewExpenseModal
          vehicles={vehicles.data?.items ?? []}
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
          }}
        />
      ) : null}
    </div>
  );
}

function NewExpenseModal({
  vehicles,
  onClose,
  onCreated,
}: {
  vehicles: { id: string; plate: string; brand: string; model: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('MAINTENANCE');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!vehicleId) {
      setError('Bir araç seçmelisiniz.');
      return;
    }
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError('Geçerli bir tutar giriniz.');
      return;
    }
    setSubmitting(true);
    try {
      await expenseService.createExpense({
        vehicleId,
        category,
        amount: value,
        expenseDate,
        description: description.trim() || undefined,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Masraf kaydedilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Yeni Masraf</h2>
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
          <Select
            label="Araç"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Araç seçin</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.brand} {v.model}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {expenseCategoryLabel(c)}
                </option>
              ))}
            </Select>
            <Input
              label="Tutar (₺)"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label="Tarih"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
            <Input
              label="Satıcı (opsiyonel)"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
          <Input
            label="Açıklama (opsiyonel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextArea
            label="Notlar (opsiyonel)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
