'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages, type MessageKey } from '@/shared/i18n';

export type ThemeMode = 'light' | 'dark' | 'ocean' | 'sunset';
export type Language = 'zh' | 'en';

type Preferences = {
  theme: ThemeMode;
  language: Language;
};

type PreferencesContextValue = {
  preferences: Preferences;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const THEME_KEY = 'socialblog.theme';
const LANG_KEY = 'socialblog.lang';

function normalizeTheme(value: unknown): ThemeMode {
  if (value === 'dark') return 'dark';
  if (value === 'ocean') return 'ocean';
  if (value === 'sunset') return 'sunset';
  return 'light';
}

function normalizeLang(value: unknown): Language {
  return value === 'zh' ? 'zh' : 'en';
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>({ theme: 'light', language: 'en' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const theme = normalizeTheme(window.localStorage.getItem(THEME_KEY));
    const language = normalizeLang(window.localStorage.getItem(LANG_KEY));
    setPreferences({ theme, language });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.lang = preferences.language;
  }, [preferences.language, preferences.theme]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((p) => ({ ...p, theme }));
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, theme);
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setPreferences((p) => ({ ...p, language }));
    if (typeof window !== 'undefined') window.localStorage.setItem(LANG_KEY, language);
  }, []);

  const value = useMemo<PreferencesContextValue>(() => ({ preferences, setTheme, setLanguage }), [preferences, setLanguage, setTheme]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('PreferencesProvider is missing');
  return ctx;
}

export function useT() {
  const { preferences } = usePreferences();
  return useCallback(
    (key: MessageKey) => {
      const item = messages[key];
      return preferences.language === 'zh' ? item.zh : item.en;
    },
    [preferences.language]
  );
}
