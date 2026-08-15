import type { Payment, PaymentMethod } from '@rentaflow/shared';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { assertOnline, newIdempotencyKey } from '@/utils/network';
import { computePaymentStatus } from '@/utils/labels';

export type PaymentSummary = {
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: ReturnType<typeof computePaymentStatus>;
  payments: PaymentListItem[];
};

export type PaymentListItem = Payment & {
  creator_name: string | null;
};

function mapError(error: unknown, fallback: string): Error {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  if (/kalan borçtan fazla/i.test(message)) {
    return new Error('Ödeme tutarı kalan borçtan fazla olamaz.');
  }
  if (/sıfırdan büyük/i.test(message)) {
    return new Error('Ödeme tutarı sıfırdan büyük olmalıdır.');
  }
  if (/İnternet/.test(message)) return new Error(message);
  return new Error(getErrorMessage(error, fallback));
}

export const paymentsService = {
  async getRentalPayments(rentalId: string): Promise<PaymentListItem[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('rental_id', rentalId)
      .order('payment_date', { ascending: false });

    if (error) throw mapError(error, 'Ödemeler yüklenemedi.');

    return ((data ?? []) as Payment[]).map((row) => ({
      ...row,
      creator_name: null,
    }));
  },

  async getRentalPaymentSummary(rentalId: string): Promise<PaymentSummary> {
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('total_amount, paid_amount, remaining_amount')
      .eq('id', rentalId)
      .single();
    if (error || !rental) throw mapError(error, 'Ödeme özeti yüklenemedi.');

    const payments = await this.getRentalPayments(rentalId);
    const activePaid = payments
      .filter((p) => !p.voided_at)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const total = Number(
      (rental as { total_amount: number }).total_amount ?? 0,
    );
    const paid = activePaid;
    const remaining = Math.max(total - paid, 0);

    return {
      total_amount: total,
      paid_amount: paid,
      remaining_amount: remaining,
      payment_status: computePaymentStatus(total, paid),
      payments,
    };
  },

  async createPayment(input: {
    rentalId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate?: string;
    referenceNumber?: string;
    note?: string;
  }): Promise<Payment> {
    await assertOnline();
    const key = newIdempotencyKey('pay');
    const { data, error } = await supabase.rpc('record_payment' as never, {
      p_rental_id: input.rentalId,
      p_amount: input.amount,
      p_payment_method: input.paymentMethod,
      p_payment_date: input.paymentDate ?? new Date().toISOString(),
      p_description: input.note ?? null,
      p_reference_number: input.referenceNumber ?? null,
      p_note: input.note ?? null,
      p_idempotency_key: key,
    } as never);

    if (error || !data) throw mapError(error, 'Ödeme kaydedilemedi.');
    return data as Payment;
  },

  async reversePayment(paymentId: string, reason?: string): Promise<Payment> {
    await assertOnline();
    const { data, error } = await supabase.rpc('reverse_payment' as never, {
      p_payment_id: paymentId,
      p_reason: reason ?? null,
    } as never);
    if (error || !data) throw mapError(error, 'Ödeme iptal edilemedi.');
    return data as Payment;
  },
};
