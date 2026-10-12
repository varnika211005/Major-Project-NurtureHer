import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES, translations, TranslationSchema } from "@/i18n";
import { LanguageInfo } from "@/i18n/languages";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationSchema;
  languages: LanguageInfo[];
  currentLanguage: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "nurtureher_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && SUPPORTED_LANGUAGES.some((item) => item.code === saved)) {
      return saved;
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const t = useMemo(() => {
    return translations[language] || translations[DEFAULT_LANGUAGE];
  }, [language]);

  const currentLanguage = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((item) => item.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguage,
    }),
    [language, t, currentLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
