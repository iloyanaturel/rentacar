import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@rentaflow/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Avoid AsyncStorage/window during Expo Router SSR (Node has no `window`). */
const canUseWebStorage = Platform.OS === 'web' && typeof window !== 'undefined';

const ExpoStorageAdapter = {
  getItem: (key: string) => {
    if (Platform.OS !== 'web') {
      return SecureStore.getItemAsync(key);
    }
    if (!canUseWebStorage) {
      return Promise.resolve(null);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS !== 'web') {
      return SecureStore.setItemAsync(key, value);
    }
    if (!canUseWebStorage) {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS !== 'web') {
      return SecureStore.deleteItemAsync(key);
    }
    if (!canUseWebStorage) {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

const looksLikePlaceholder =
  /YOUR_|your_dev|placeholder|example\.com/i.test(supabaseUrl) ||
  /YOUR_|your_dev|placeholder|anon_key/i.test(supabaseAnonKey) ||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl) ||
  supabaseAnonKey.length < 20;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey) && !looksLikePlaceholder;

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: ExpoStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
