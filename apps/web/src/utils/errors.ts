/**
 * Maps technical errors to Turkish user-facing messages.
 * Never show raw PostgREST / network dumps in UI.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  const defaultMessage =
    fallback ?? 'İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.';

  if (!error) return defaultMessage;

  if (typeof error === 'string') {
    return sanitize(error, defaultMessage);
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      message?: string;
      code?: string;
      status?: number;
      name?: string;
    };

    if (maybe.message) {
      const msg = maybe.message.toLowerCase();

      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid_credentials') ||
        maybe.status === 400
      ) {
        return 'Girdiğiniz e-posta veya şifre hatalı.';
      }

      if (msg.includes('email not confirmed')) {
        return 'E-posta adresiniz henüz doğrulanmamış.';
      }

      if (
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('failed to fetch')
      ) {
        return 'Sunucuya ulaşılamadı. .env.local içindeki NEXT_PUBLIC_SUPABASE_URL / ANON_KEY değerlerini kontrol edin ve sunucuyu yeniden başlatın.';
      }

      if (msg.includes('organization') || msg.includes('organizasyon')) {
        return 'Kullanıcı organizasyonu bulunamadı. Yöneticinizle iletişime geçin.';
      }

      if (
        msg.includes('edge function') ||
        msg.includes('non-2xx') ||
        msg.includes('failed to send a request')
      ) {
        return fallback ?? 'Davet servisine ulaşılamadı. Lütfen tekrar deneyin.';
      }

      // Prefer a sanitized message over a generic fallback when the API
      // already returned a user-facing explanation (e.g. Turkish invite errors).
      return sanitize(maybe.message, defaultMessage);
    }
  }

  console.warn('[RentaFlow] Unknown error', error);
  return defaultMessage;
}

function sanitize(message: string, fallback: string): string {
  if (/postgrest|relation |permission denied|jwt/i.test(message)) {
    console.warn('[RentaFlow]', message);
    return fallback;
  }
  return message;
}
