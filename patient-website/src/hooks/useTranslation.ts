import { useApp } from "../context/AppContext";
import en from "../i18n/en.json";
import hi from "../i18n/hi.json";
import ta from "../i18n/ta.json";
import gu from "../i18n/gu.json";

const translations: Record<string, any> = { en, hi, ta, gu };

export function useTranslation() {
  const { user, updateProfile } = useApp();
  const currentLang = user?.preferredLanguage || "en";

  const t = (key: string): string => {
    const keys = key.split(".");
    let value = translations[currentLang] || en;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key is missing in active language
        let fallbackValue = en;
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === "object" && fk in fallbackValue) {
            fallbackValue = (fallbackValue as any)[fk];
          } else {
            return key;
          }
        }
        return typeof fallbackValue === "string" ? fallbackValue : key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  const changeLanguage = (lang: "en" | "hi" | "ta" | "gu") => {
    updateProfile({ preferredLanguage: lang });
  };

  return {
    t,
    language: currentLang,
    changeLanguage,
  };
}
