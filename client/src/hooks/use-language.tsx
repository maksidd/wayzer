import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { translations } from '@/lib/i18n';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
  availableLanguages: { code: string; name: string }[];
};

const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' }
];

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(
    localStorage.getItem('userLanguage') || navigator.language.split('-')[0] || 'en'
  );

  // Ensure we use a supported language (fallback to English)
  useEffect(() => {
    if (!availableLanguages.some(lang => lang.code === language)) {
      setLanguageState('en');
    }
  }, [language]);

  // Save language preference to localStorage
  const setLanguage = (lang: string) => {
    localStorage.setItem('userLanguage', lang);
    setLanguageState(lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let translated: any = translations[language] || translations['en']; // Fallback to English
    
    // Navigate through the translation object
    for (const k of keys) {
      if (translated[k] === undefined) {
        // Key not found, return the key itself
        return key;
      }
      translated = translated[k];
    }
    
    // If it's a string, return it (possibly with replacements)
    if (typeof translated === 'string') {
      if (params) {
        return Object.entries(params).reduce(
          (str, [key, value]) => str.replace(`{{${key}}}`, value),
          translated
        );
      }
      return translated;
    }
    
    // If not a string (e.g., reached an object), return the key
    return key;
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        t,
        availableLanguages
      }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
