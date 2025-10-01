import { useLanguageStore } from '../../store/languageStore';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      background: 'var(--color-surface)',
      borderRadius: '10px',
      padding: '3px',
      border: '1px solid var(--color-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      {(['tr', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          style={{
            padding: '5px 11px',
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            background: language === lang ? 'var(--primary)' : 'transparent',
            color: language === lang ? '#fff' : 'var(--color-text-secondary)',
            boxShadow: language === lang ? '0 1px 4px rgba(37,99,235,0.3)' : 'none',
          }}
        >
          {lang === 'tr' ? 'TR' : 'EN'}
        </button>
      ))}
    </div>
  );
}