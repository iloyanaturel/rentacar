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
import { customersService, type CustomerFilter } from '@/services/customersService';
import { formatCurrency } from '@/utils/currency';
import { maskPhone } from '@/utils/labels';
import { getErrorMessage } from '@/utils/errors';

const FILTERS: { value: CustomerFilter; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'HAS_RENTALS', label: 'Kiralaması olan' },
  { value: 'HAS_BALANCE', label: 'Açık bakiyesi olan' },
];

export default function CustomersPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['customers', { search, filter, page }],
    queryFn: () => customersService.getCustomers({ search, filter, page }),
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        description="Kiracı bilgilerini ve bakiyelerini yönetin."
        actions={
          can('customers.create') ? (
            <Link href="/customers/new">
              <Button>
                <Plus className="h-4 w-4" /> Müşteri Ekle
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
              placeholder="Ad, telefon veya e-posta ara…"
              className="pl-9"
            />
          </div>
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as CustomerFilter);
              setPage(0);
            }}
            className="sm:w-56"
          >
            {FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorBanner message={getErrorMessage(query.error, 'Müşteriler yüklenemedi.')} />
      ) : null}

      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState
          title="Müşteri bulunamadı"
          description="Arama kriterlerinizi değiştirin veya yeni bir müşteri ekleyin."
          action={
            can('customers.create') ? (
              <Link href="/customers/new">
                <Button>Müşteri Ekle</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {!query.isLoading && !query.isError && items.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-rf-border text-left text-xs uppercase tracking-wide text-rf-faint">
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Kiralama</th>
                <th className="px-4 py-3">Açık Bakiye</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-rf-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-semibold text-rf-primary hover:underline"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{maskPhone(c.phone)}</td>
                  <td className="px-4 py-3">{c.rental_count}</td>
                  <td className="px-4 py-3">
                    {c.open_balance > 0 ? (
                      <span className="font-semibold text-rf-danger">
                        {formatCurrency(c.open_balance)}
                      </span>
                    ) : (
                      formatCurrency(0)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.is_active ? 'success' : 'neutral'}>
                      {c.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-rf-secondary">Sayfa {page + 1}</p>
          <div className="flex gap-2">
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
