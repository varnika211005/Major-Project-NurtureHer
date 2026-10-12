import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES } from "./languages";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { kn } from "./translations/kn";
import { ta } from "./translations/ta";
import { te } from "./translations/te";
import { ml } from "./translations/ml";
import { TranslationSchema } from "./types";

export const translations: Record<LanguageCode, TranslationSchema> = {
  en,
  hi,
  kn,
  ta,
  te,
  ml,
};

export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES };
export type { LanguageCode, TranslationSchema };
