import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi, invalidateAuthSession, meApi, setOnUnauthorizedHandler } from '../services/api';
import {
  clearTokens,
  getAgeVerified,
  getTokens,
  setAgeVerified,
  setTokens,
} from '../services/tokenStorage';
import { AuthUser, MeProfileResponse } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  meProfile: MeProfileResponse | null;
  loading: boolean;
  ageVerified: boolean;
  confirmAge: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<MeProfileResponse | null>;
  applyMeProfile: (profile: MeProfileResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meProfile, setMeProfile] = useState<MeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ageVerified, setAgeVerifiedState] = useState(false);
  const sessionGenRef = useRef(0);

  const handleForcedLogout = useCallback(() => {
    sessionGenRef.current += 1;
    setUser(null);
    setMeProfile(null);
  }, []);

  useEffect(() => {
    setOnUnauthorizedHandler(handleForcedLogout);
    return () => setOnUnauthorizedHandler(null);
  }, [handleForcedLogout]);

  const refreshMe = useCallback(async (): Promise<MeProfileResponse | null> => {
    const gen = sessionGenRef.current;
    const { accessToken, refreshToken } = await getTokens();
    if (!accessToken && !refreshToken) {
      return null;
    }
    try {
      const profile = await meApi.getProfile();
      if (sessionGenRef.current !== gen) {
        return null;
      }
      setMeProfile(profile);
      setUser(profile.user);
      return profile;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const gen = sessionGenRef.current;
    (async () => {
      try {
        const [verified, tokens] = await Promise.all([getAgeVerified(), getTokens()]);
        if (!active || sessionGenRef.current !== gen) return;
        setAgeVerifiedState(verified);
        if (tokens.accessToken || tokens.refreshToken) {
          const profile = await meApi.getProfile().catch(() => null);
          if (!active || sessionGenRef.current !== gen) return;
          if (profile) {
            setMeProfile(profile);
            setUser(profile.user);
          } else {
            await clearTokens();
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const confirmAge = useCallback(async () => {
    await setAgeVerified();
    setAgeVerifiedState(true);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      sessionGenRef.current += 1;
      const gen = sessionGenRef.current;
      const res = await authApi.login({ username, password });
      if (sessionGenRef.current !== gen) return;
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await refreshMe();
    },
    [refreshMe]
  );

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      sessionGenRef.current += 1;
      const gen = sessionGenRef.current;
      const res = await authApi.register({ email, username, password });
      if (sessionGenRef.current !== gen) return;
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      await refreshMe();
    },
    [refreshMe]
  );

  const logout = useCallback(async () => {
    sessionGenRef.current += 1;
    invalidateAuthSession();
    const { refreshToken } = await getTokens();
    await clearTokens();
    setUser(null);
    setMeProfile(null);
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => {});
    }
  }, []);

  const applyMeProfile = useCallback((profile: MeProfileResponse) => {
    setMeProfile(profile);
    setUser(profile.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        meProfile,
        loading,
        ageVerified,
        confirmAge,
        login,
        register,
        logout,
        refreshMe,
        applyMeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
