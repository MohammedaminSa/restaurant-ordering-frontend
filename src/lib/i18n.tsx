import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCallback } from "react";
import { translations, type TranslationKey } from "./translations";

export type Language = "en" | "or" | "am";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  or: "Afaan Oromoo",
  am: "አማርኛ",
};

interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => {
        set({ language });
        if (typeof document !== "undefined") {
          document.documentElement.lang = language;
        }
      },
    }),
    {
      name: "bistro-language-v1",
      partialize: (state) => ({ language: state.language }),
    },
  ),
);

export function translate(key: TranslationKey, language?: Language): string {
  const current = language ?? useI18nStore.getState().language;
  const dict = translations[current] ?? translations.en;
  let value: unknown = dict;
  for (const part of key.split(".")) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }
  return typeof value === "string" ? value : key;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] != null ? String(params[name]) : match,
  );
}

export function useT() {
  const language = useI18nStore((s) => s.language);
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(translate(key, language), params),
    [language],
  );
  const setLanguage = useI18nStore((s) => s.setLanguage);
  return { t, language, setLanguage };
}
