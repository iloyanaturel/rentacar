/** Pure rental pricing helpers (no Supabase / Expo deps). */

export function calcRentalPricing(input: {
  dailyPrice: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  discount: number;
  extra: number;
  deposit: number;
}) {
  const start = new Date(`${input.startDate}T${input.startTime}`);
  const end = new Date(`${input.endDate}T${input.endTime}`);
  const ms = end.getTime() - start.getTime();
  const days = Math.max(1, Math.ceil(ms / 86400000));
  const subtotal = Math.round(days * input.dailyPrice * 100) / 100;
  const discount = Math.max(0, input.discount);
  const extra = Math.max(0, input.extra);
  if (discount > subtotal) {
    throw new Error('İndirim tutarı toplam tutardan fazla olamaz.');
  }
  const total = Math.round((subtotal - discount + extra) * 100) / 100;
  const deposit = Math.max(0, input.deposit);
  return {
    days,
    subtotal,
    discount,
    extra,
    total,
    deposit,
    payable: Math.round((total + deposit) * 100) / 100,
  };
}
