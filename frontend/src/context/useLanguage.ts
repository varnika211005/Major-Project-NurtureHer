import { useContext } from "react";
import { LanguageContext, LanguageContextType } from "./language-context";

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export { LanguageProvider } from "./LanguageContext";
