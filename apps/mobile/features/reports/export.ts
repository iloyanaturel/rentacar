import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { reportService } from '@/services/reportService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { expenseCategoryLabel } from '@/utils/labels';
import type {
  CustomerPerformance,
  FinancialSummary,
  MonthlyFinanceRow,
  VehiclePerformance,
} from '@/services/reportService';

const UTF8 = FileSystem.EncodingType?.UTF8 ?? 'utf8';
const BASE64 = FileSystem.EncodingType?.Base64 ?? 'base64';

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function shareFile(uri: string, mimeType: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Paylaşım bu cihazda desteklenmiyor.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Raporu paylaş' });
}

export async function exportVehicleCsv(
  rows: VehiclePerformance[],
  from: string,
  to: string,
) {
  const header =
    'Araç,Plaka,Kiralama,Gün,Gelir,Masraf,Net,Doluluk\n';
  const body = rows
    .map((r) =>
      [
        `${r.brand} ${r.model}`,
        r.plate,
        r.rental_count,
        r.rental_days,
        r.revenue,
        r.expenses,
        r.net_income,
        r.occupancy_rate,
      ]
        .map(escapeCsv)
        .join(','),
    )
    .join('\n');
  const uri = `${FileSystem.cacheDirectory}rentaflow-araclar-${from}_${to}.csv`;
  await FileSystem.writeAsStringAsync(uri, '\uFEFF' + header + body, {
    encoding: UTF8 as never,
  });
  await reportService.logExport('EXPORT_CSV', { from, to, kind: 'vehicles' });
  await shareFile(uri, 'text/csv');
}

export async function exportExcelWorkbook(input: {
  from: string;
  to: string;
  summary: FinancialSummary;
  vehicles: VehiclePerformance[];
  customers: CustomerPerformance[];
  monthly: MonthlyFinanceRow[];
  expenses: Array<{ category: string; amount: number }>;
  payments: Array<{ payment_method: string; amount: number }>;
}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['RentaFlow Rapor'],
      ['Dönem', `${input.from} - ${input.to}`],
      [],
      ['Toplam Ciro', input.summary.revenue],
      ['Tahsilat', input.summary.collected],
      ['Bekleyen', input.summary.outstanding],
      ['Masraf', input.summary.expenses],
      ['Net', input.summary.net_income],
    ]),
    'Özet',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      input.vehicles.map((v) => ({
        Araç: `${v.brand} ${v.model}`,
        Plaka: v.plate,
        Kiralama: v.rental_count,
        Gün: v.rental_days,
        Gelir: v.revenue,
        Masraf: v.expenses,
        Net: v.net_income,
        Doluluk: v.occupancy_rate,
      })),
    ),
    'Araçlar',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      input.customers.map((c) => ({
        Müşteri: `${c.first_name} ${c.last_name}`,
        Telefon: c.phone ?? '',
        Kiralama: c.rental_count,
        Harcama: c.total_spend,
        Ödenen: c.total_paid,
        Kalan: c.open_balance,
      })),
    ),
    'Müşteriler',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      input.monthly.map((m) => ({
        Ay: m.month_start,
        Gelir: m.revenue,
        Tahsilat: m.collected,
        Masraf: m.expenses,
        Net: m.net_income,
      })),
    ),
    'Kiralamalar',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      input.payments.map((p) => ({
        Yöntem: p.payment_method,
        Tutar: p.amount,
      })),
    ),
    'Ödemeler',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      input.expenses.map((e) => ({
        Kategori: e.category,
        Tutar: e.amount,
      })),
    ),
    'Masraflar',
  );

  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.cacheDirectory}rentaflow-rapor-${input.from}_${input.to}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, b64, {
    encoding: BASE64 as never,
  });
  await reportService.logExport('EXPORT_EXCEL', {
    from: input.from,
    to: input.to,
  });
  await shareFile(
    uri,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

export async function exportReportPdf(input: {
  from: string;
  to: string;
  summary: FinancialSummary;
  vehicles: VehiclePerformance[];
  customers: CustomerPerformance[];
  expenses: Array<{ category: string; amount: number }>;
}) {
  const topVehicles = input.vehicles.slice(0, 10);
  const topCustomers = [...input.customers]
    .sort((a, b) => Number(b.total_spend) - Number(a.total_spend))
    .slice(0, 10);

  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#0F172A;padding:24px;font-size:12px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 8px;color:#0F766E}
  .muted{color:#64748B} .kpi{display:flex;flex-wrap:wrap;gap:12px}
  .card{border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;min-width:120px}
  .v{font-size:16px;font-weight:700} table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border-bottom:1px solid #E2E8F0;padding:6px 4px;text-align:left}
  th{color:#64748B;font-weight:600}
</style></head><body>
  <h1>RentaFlow</h1>
  <p class="muted">Rapor Tarihi: ${formatDate(input.from)} – ${formatDate(input.to)}</p>
  <h2>Özet</h2>
  <div class="kpi">
    <div class="card"><div class="muted">TOPLAM CİRO</div><div class="v">${formatCurrency(input.summary.revenue)}</div></div>
    <div class="card"><div class="muted">TAHSİLAT</div><div class="v">${formatCurrency(input.summary.collected)}</div></div>
    <div class="card"><div class="muted">BEKLEYEN</div><div class="v">${formatCurrency(input.summary.outstanding)}</div></div>
    <div class="card"><div class="muted">MASRAF</div><div class="v">${formatCurrency(input.summary.expenses)}</div></div>
    <div class="card"><div class="muted">NET</div><div class="v">${formatCurrency(input.summary.net_income)}</div></div>
  </div>
  <h2>En İyi 10 Araç</h2>
  <table><thead><tr><th>Araç</th><th>Plaka</th><th>Gelir</th><th>Masraf</th><th>Net</th><th>Doluluk</th></tr></thead>
  <tbody>${topVehicles
    .map(
      (v) =>
        `<tr><td>${v.brand} ${v.model}</td><td>${v.plate}</td><td>${formatCurrency(v.revenue)}</td><td>${formatCurrency(v.expenses)}</td><td>${formatCurrency(v.net_income)}</td><td>%${v.occupancy_rate}</td></tr>`,
    )
    .join('')}</tbody></table>
  <h2>En İyi 10 Müşteri</h2>
  <table><thead><tr><th>Müşteri</th><th>Kiralama</th><th>Harcama</th><th>Kalan</th></tr></thead>
  <tbody>${topCustomers
    .map(
      (c) =>
        `<tr><td>${c.first_name} ${c.last_name}</td><td>${c.rental_count}</td><td>${formatCurrency(c.total_spend)}</td><td>${formatCurrency(c.open_balance)}</td></tr>`,
    )
    .join('')}</tbody></table>
  <h2>Masraf Kategorileri</h2>
  <table><thead><tr><th>Kategori</th><th>Tutar</th></tr></thead>
  <tbody>${input.expenses
    .map(
      (e) =>
        `<tr><td>${expenseCategoryLabel(e.category)}</td><td>${formatCurrency(e.amount)}</td></tr>`,
    )
    .join('')}</tbody></table>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await reportService.logExport('EXPORT_REPORT', {
    from: input.from,
    to: input.to,
    format: 'pdf',
  });
  await shareFile(uri, 'application/pdf');
}

export async function exportRentalContractPdf(rentalId: string) {
  const data = (await reportService.getRentalContractData(rentalId)) as {
    organization_name?: string;
    contract_number?: string;
    rental: Record<string, unknown>;
    customer: {
      first_name: string;
      last_name: string;
      phone: string;
      address: string;
    };
    vehicle: { brand: string; model: string; plate: string; start_km?: number };
    handover?: { odometer_km?: number; fuel_level?: string } | null;
    return?: { odometer_km?: number; fuel_level?: string } | null;
    damages?: Array<{
      location_label?: string;
      description?: string;
      severity?: string;
      estimated_amount?: number;
    }>;
  };
  const r = data.rental;
  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/>
<style>
  body{font-family:Helvetica,Arial,sans-serif;color:#0F172A;padding:28px;font-size:12px;line-height:1.45}
  h1{font-size:20px;margin:0} h2{font-size:13px;margin:18px 0 6px;border-bottom:1px solid #E2E8F0;padding-bottom:4px;color:#0F766E}
  .row{margin:2px 0} .muted{color:#64748B} .sig{margin-top:40px;display:flex;justify-content:space-between}
  .line{margin-top:36px;border-top:1px solid #94A3B8;width:40%;padding-top:6px}
</style></head><body>
  <h1>${data.organization_name ?? 'RentaFlow'}</h1>
  <p class="muted">Kiralama Sözleşmesi · ${data.contract_number ?? ''}</p>
  <p class="muted">Tarih: ${formatDate(String(r.start_date ?? ''))}</p>
  <h2>MÜŞTERİ</h2>
  <div class="row">Ad Soyad: ${data.customer.first_name} ${data.customer.last_name}</div>
  <div class="row">Telefon: ${data.customer.phone || '—'}</div>
  <div class="row">Adres: ${data.customer.address || '—'}</div>
  <h2>ARAÇ</h2>
  <div class="row">Marka / Model: ${data.vehicle.brand} ${data.vehicle.model}</div>
  <div class="row">Plaka: ${data.vehicle.plate}</div>
  <div class="row">KM: ${r.start_km ?? data.vehicle.start_km ?? '—'}</div>
  <h2>KİRALAMA</h2>
  <div class="row">Başlangıç: ${formatDate(String(r.start_date))} ${String(r.start_time ?? '').slice(0, 5)}</div>
  <div class="row">Teslim: ${formatDate(String(r.end_date))} ${String(r.end_time ?? '').slice(0, 5)}</div>
  <div class="row">Gün: ${r.total_days ?? '—'}</div>
  <div class="row">Günlük fiyat: ${formatCurrency(Number(r.daily_price ?? 0))}</div>
  <h2>FİNANS</h2>
  <div class="row">Kiralama bedeli: ${formatCurrency(Number(r.subtotal ?? 0))}</div>
  <div class="row">İndirim: ${formatCurrency(Number(r.discount_amount ?? 0))}</div>
  <div class="row">Ek ücret: ${formatCurrency(Number(r.extra_charge ?? 0) + Number(r.late_fee ?? 0))}</div>
  <div class="row">Toplam: ${formatCurrency(Number(r.total_amount ?? 0))}</div>
  <div class="row">Depozito: ${formatCurrency(Number(r.deposit_amount ?? 0))}</div>
  <div class="row">Ödenen: ${formatCurrency(Number(r.paid_amount ?? 0))}</div>
  <div class="row">Kalan: ${formatCurrency(Number(r.remaining_amount ?? 0))}</div>
  <h2>TESLİM</h2>
  <div class="row">Teslim KM: ${data.handover?.odometer_km ?? r.start_km ?? '—'}</div>
  <div class="row">Yakıt: ${data.handover?.fuel_level ?? r.fuel_start ?? '—'}</div>
  <h2>İADE</h2>
  <div class="row">İade KM: ${data.return?.odometer_km ?? r.end_km ?? '—'}</div>
  <div class="row">Yakıt: ${data.return?.fuel_level ?? r.fuel_end ?? '—'}</div>
  <h2>HASAR</h2>
  ${(data.damages ?? []).length === 0
    ? '<div class="row">Hasar kaydı yok.</div>'
    : (data.damages ?? [])
        .map(
          (d) =>
            `<div class="row">${d.location_label ?? ''} — ${d.description ?? ''} (${formatCurrency(Number(d.estimated_amount ?? 0))})</div>`,
        )
        .join('')}
  <div class="sig">
    <div class="line">Müşteri</div>
    <div class="line">Yetkili</div>
  </div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  await reportService.logExport('GENERATE_RENTAL_PDF', {
    rental_id: rentalId,
    contract_number: data.contract_number,
  });
  await shareFile(uri, 'application/pdf');
  return data.contract_number;
}
