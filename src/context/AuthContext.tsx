import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseEnabled } from '../lib/supabase';
import type { DbProfile } from '../lib/database.types';
import {
  ensureMyProfile,
  getDisplayName,
  sendEmailOtp,
  signInWithGoogle,
  signOut as authSignOut,
  verifyEmailOtp,
} from '../services/authService';

interface AuthContextValue {
  enabled: boolean;
  user: User | null;
  profile: DbProfile | null;
  displayName: string;
  isLoggedIn: boolean;
  loading: boolean;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = isSupabaseEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(enabled);

  const loadProfile = useCallback((sessionUser: User) => {
    ensureMyProfile(sessionUser)
      .then((p) => setProfile(p))
      .catch(() => setProfile(null));
  }, []);

  const applySession = useCallback(
    (session: Session | null, event?: AuthChangeEvent) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(session.user);

      // 토큰 갱신만이면 프로필 재조회 생략
      if (event === 'TOKEN_REFRESHED') return;

      loadProfile(session.user);
    },
    [loadProfile]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      applySession(session, 'INITIAL_SESSION');
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      applySession(session, event);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled, applySession]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const p = await ensureMyProfile(session.user);
      setProfile(p);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled,
      user,
      profile,
      displayName: getDisplayName(user, profile),
      isLoggedIn: Boolean(user),
      loading,
      sendEmailOtp,
      verifyEmailOtp,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [enabled, user, profile, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
