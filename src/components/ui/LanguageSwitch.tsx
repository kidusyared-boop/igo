import { useLang, useT, type Lang } from '../../i18n';

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
];

export function LanguageSwitch() {
  const [lang, setLang] = useLang();
  const t = useT();
  return (
    <div className="segmented lang-switch" role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l.value} type="button" lang={l.value} aria-pressed={l.value === lang} onClick={() => setLang(l.value)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
