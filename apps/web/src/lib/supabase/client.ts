'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@rentaflow/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const looksLikePlaceholder =
  /YOUR_|your_dev|placeholder|example\.com/i.test(supabaseUrl) ||
  /YOUR_|your_dev|placeholder|anon_key/i.test(supabaseAnonKey) ||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl) ||
  supabaseAnonKey.length < 20;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey) && !looksLikePlaceholder;

export function createClient() {
  return createBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
  );
}

/** Singleton for client components / services */
export const supabase = createClient();
