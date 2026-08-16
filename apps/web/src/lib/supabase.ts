/**
 * Browser Supabase client used by services and AuthProvider.
 * Server components should import from `@/lib/supabase/server`.
 */
export {
  supabase,
  createClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
