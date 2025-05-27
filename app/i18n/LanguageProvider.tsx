"use client";

import { ReactNode, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, Language, LANGUAGES, LanguageContext, getTranslation, getClientLanguage } from "./index";
import { getLanguageFont, getLanguageTitleFont, getLanguageSerifFont } from "./fonts";
import LoadingTransition from "@/components/LoadingTransition";

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const clientLanguage = getClientLanguage();
    setLanguageState(clientLanguage);
    
    if (isFirstLoad) {
      setShowTransition(true);
      setTimeout(() => {
        setShowTransition(false);
        setIsFirstLoad(false);
      }, 3000);
    }
    
    setIsLoaded(true);
  }, [isFirstLoad]);

  const setLanguage = (newLanguage: Language) => {
    if (LANGUAGES.includes(newLanguage) && newLanguage !== language) {
      setShowTransition(true);

      setTimeout(() => {
        setLanguageState(newLanguage);
        localStorage.setItem("language", newLanguage);
        
        setTimeout(() => {
          setShowTransition(false);
        }, 2000);
      }, 500);
    }
  };

  const t = (key: string) => {
    return getTranslation(language, key);
  };

  const fontClass = getLanguageFont(language);
  const titleFontClass = getLanguageTitleFont(language);
  const serifFontClass = getLanguageSerifFont(language);

  if (!isLoaded && typeof window !== "undefined") {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, fontClass, titleFontClass, serifFontClass }}>
      {showTransition && <LoadingTransition duration={3000} />}
      {children}
    </LanguageContext.Provider>
  );
}
