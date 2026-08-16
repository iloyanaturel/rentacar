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

      if (msg.includes('network') || msg.includes('fetch')) {
        return 'İnternet bağlantısı kurulamadı. Lütfen tekrar deneyin.';
      }

      if (msg.includes('organization') || msg.includes('organizasyon')) {
        return 'Kullanıcı organizasyonu bulunamadı. Yöneticinizle iletişime geçin.';
      }

      // Log technical detail, return safe message
      console.warn('[RentaFlow]', maybe.code ?? maybe.name, maybe.message);
      return defaultMessage;
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
