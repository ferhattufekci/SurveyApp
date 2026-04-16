import { useThemeStore } from '../../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        background: '#f3f4f6',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'all 0.15s',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}