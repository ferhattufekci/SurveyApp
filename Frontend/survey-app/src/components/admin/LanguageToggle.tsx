import { useLanguageStore } from '../../store/languageStore';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      background: '#f3f4f6',
      borderRadius: '8px',
      padding: '3px',
      border: '1px solid #e5e7eb',
    }}>
      {(['tr', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            background: language === lang ? '#fff' : 'transparent',
            color: language === lang ? '#2563EB' : '#6b7280',
            boxShadow: language === lang ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
        </button>
      ))}
    </div>
  );
}