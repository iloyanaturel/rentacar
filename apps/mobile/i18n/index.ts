/**
 * Minimal i18n — Turkish default; English keys ready for STEP expansion.
 */
import { useSyncExternalStore } from 'react';

export type Locale = 'tr' | 'en';

const dict = {
  tr: {
    'settings.title': 'Ayarlar',
    'settings.profile': 'Profil',
    'settings.business': 'İşletme',
    'settings.users': 'Kullanıcılar',
    'settings.roles': 'Roller ve Yetkiler',
    'settings.rental': 'Kiralama Ayarları',
    'settings.notifications': 'Bildirimler',
    'settings.contract': 'Sözleşme',
    'settings.finance': 'Finans',
    'settings.security': 'Güvenlik',
    'settings.app': 'Uygulama',
    'settings.support': 'Destek',
    'settings.about': 'Hakkında',
    'common.retry': 'Tekrar Dene',
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'error.generic': 'Bir sorun oluştu.',
    'error.network': 'İnternet bağlantınızı kontrol edin.',
    'error.unauthorized': 'Bu işlem için yetkiniz bulunmuyor.',
    'empty.vehicles': 'Henüz araç eklemediniz.',
    'onboarding.title': 'Kuruluma Hoş Geldiniz',
  },
  en: {
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.business': 'Business',
    'settings.users': 'Users',
    'settings.roles': 'Roles & Permissions',
    'settings.rental': 'Rental Settings',
    'settings.notifications': 'Notifications',
    'settings.contract': 'Contract',
    'settings.finance': 'Finance',
    'settings.security': 'Security',
    'settings.app': 'App',
    'settings.support': 'Support',
    'settings.about': 'About',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'error.generic': 'Something went wrong.',
    'error.network': 'Check your internet connection.',
    'error.unauthorized': 'You are not authorized for this action.',
    'empty.vehicles': 'No vehicles yet.',
    'onboarding.title': 'Welcome to setup',
  },
} as const;

export type I18nKey = keyof (typeof dict)['tr'];

let locale: Locale = 'tr';
const listeners = new Set<() => void>();

export function setLocale(next: Locale) {
  locale = next;
  listeners.forEach((l) => l());
}

export function getLocale(): Locale {
  return locale;
}

export function t(key: I18nKey): string {
  return dict[locale][key] ?? dict.tr[key] ?? key;
}

export function useI18n() {
  const current = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => locale,
    () => 'tr' as Locale,
  );
  return {
    locale: current,
    t,
    setLocale,
  };
}
