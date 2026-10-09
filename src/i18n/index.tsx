import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { am } from './am';

export type Lang = 'en' | 'am';
export type TKey = keyof typeof en;
export type TVars = Record<string, string | number>;
export type TFunction = (key: TKey, vars?: TVars) => string;

const STORAGE_KEY = 'igo.lang.v1';
const STRINGS: Record<Lang, Record<TKey, string>> = { en, am };

export function isKey(text: string): text is TKey {
  return Object.hasOwn(en, text);
}

/** Fills {name} placeholders. Unknown placeholders are left as they are. */
export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  const text = STRINGS[lang][key] || en[key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'en', setLang: () => {}, t: (key, vars) => translate('en', key, vars) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice lasts until the page closes.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): TFunction {
  return useContext(LanguageContext).t;
}

export function useLang(): [Lang, (lang: Lang) => void] {
  const { lang, setLang } = useContext(LanguageContext);
  return [lang, setLang];
}
