import type { Organization, Profile, UserRole } from '@rentaflow/shared';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/utils/errors';
import { queryClient } from '@/lib/queryClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  role: UserRole | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfileBundle(userId: string): Promise<{
  profile: Profile;
  organization: Organization;
}> {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    throw profileError ?? new Error('Profil bulunamadı');
  }

  const profile = profileData as Profile;

  const { data: organizationData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .is('deleted_at', null)
    .single();

  if (orgError || !organizationData) {
    throw orgError ?? new Error('Organizasyon bulunamadı');
  }

  return {
    profile,
    organization: organizationData as Organization,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const clearLocal = useCallback(() => {
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, []);

  const loadUserData = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      clearLocal();
      return;
    }

    setSession(nextSession);
    try {
      const bundle = await fetchProfileBundle(nextSession.user.id);
      setProfile(bundle.profile);
      setOrganization(bundle.organization);
      setStatus('authenticated');
    } catch (error) {
      console.warn('[Auth] profile load failed', getErrorMessage(error));
      // Session exists but profile missing — still mark authenticated with null org
      setProfile(null);
      setOrganization(null);
      setStatus('authenticated');
    }
  }, [clearLocal]);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setStatus('unauthenticated');
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        return loadUserData(data.session);
      })
      .catch((error) => {
        console.warn('[Auth] getSession', getErrorMessage(error));
        if (mounted) clearLocal();
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void loadUserData(nextSession);
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [clearLocal, loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase yapılandırması eksik. Lütfen ortam değişkenlerini kontrol edin.',
      );
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearLocal();
  }, [clearLocal]);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Supabase yapılandırması eksik. Lütfen ortam değişkenlerini kontrol edin.',
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const bundle = await fetchProfileBundle(session.user.id);
    setProfile(bundle.profile);
    setOrganization(bundle.organization);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      organization,
      role: profile?.role ?? null,
      isConfigured: isSupabaseConfigured,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [
      status,
      session,
      profile,
      organization,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
