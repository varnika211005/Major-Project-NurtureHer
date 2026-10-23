import { createContext } from "react";
import { LanguageCode, TranslationSchema } from "@/i18n";
import { LanguageInfo } from "@/i18n/languages";

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationSchema;
  languages: LanguageInfo[];
  currentLanguage: LanguageInfo;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LANGUAGE_STORAGE_KEY = "nurtureher_language";
