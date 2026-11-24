import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { COLORS, GRADIENTS } from '../theme/tokens';

export interface AppThemeValue {
  code: string;
  name: string;
  primary: string;
  bright: string;
  border: string;
  tintBg: string;
  gradientBtn: readonly [string, string, string];
}

const DEFAULT_THEME: AppThemeValue = {
  code: 'theme_classic_amber',
  name: 'Ámbar Clásico',
  primary: COLORS.amber,
  bright: COLORS.amberBright,
  border: COLORS.borderGold,
  tintBg: COLORS.amberBg,
  gradientBtn: GRADIENTS.amberBtn,
};

const ThemeContext = createContext<AppThemeValue>(DEFAULT_THEME);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const theme = useMemo<AppThemeValue>(() => {
    const equipped = user?.equippedColorTheme;
    const meta = equipped?.metadata;
    if (!equipped || !meta) {
      return DEFAULT_THEME;
    }

    const primary = typeof meta.primary === 'string' ? meta.primary : DEFAULT_THEME.primary;
    const bright = typeof meta.bright === 'string' ? meta.bright : DEFAULT_THEME.bright;
    const border = typeof meta.border === 'string' ? meta.border : DEFAULT_THEME.border;
    const tintBg = typeof meta.tintBg === 'string' ? meta.tintBg : DEFAULT_THEME.tintBg;
    const rawGrad = Array.isArray(meta.gradientBtn) && meta.gradientBtn.length >= 3
      ? ([
          String(meta.gradientBtn[0]),
          String(meta.gradientBtn[1]),
          String(meta.gradientBtn[2]),
        ] as const)
      : DEFAULT_THEME.gradientBtn;

    return {
      code: equipped.code,
      name: equipped.name,
      primary,
      bright,
      border,
      tintBg,
      gradientBtn: rawGrad,
    };
  }, [user?.equippedColorTheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  return useContext(ThemeContext);
}
