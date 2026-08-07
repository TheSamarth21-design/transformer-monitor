import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Language } from "@/lib/translations";
import { apiRequest } from "@/lib/api";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_language");
    if (saved === "hi" || saved === "mr" || saved === "en") {
      return saved;
    }
    return "en";
  });

  useEffect(() => {
    // Fetch user settings from server if available
    apiRequest("/settings")
      .then((data) => {
        if (data.language) {
          const mapped: Record<string, Language> = {
            English: "en",
            Hindi: "hi",
            Marathi: "mr",
            en: "en",
            hi: "hi",
            mr: "mr",
          };
          if (mapped[data.language]) {
            setLanguageState(mapped[data.language]);
            localStorage.setItem("app_language", mapped[data.language]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);

    // Save to backend settings
    const langNames: Record<Language, string> = {
      en: "English",
      hi: "Hindi",
      mr: "Marathi",
    };
    apiRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify({ language: langNames[lang] }),
    }).catch(() => {});
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations["en"];
    return dict[key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
