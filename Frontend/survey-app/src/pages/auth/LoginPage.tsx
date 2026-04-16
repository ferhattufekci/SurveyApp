import { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';
import LanguageToggle from '../../components/admin/LanguageToggle';
import ThemeToggle from '../../components/admin/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { language } = useLanguageStore();
  const navigate = useNavigate();
useEffect(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }
  return () => {
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
  };
}, []);
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  // iOS Safari fix — input blur + viewport scale sıfırlama
  // blur() klavyeyi kapatır, viewport meta geçici maximum-scale=1 ile
  // zoom'u sıfırlar, 300ms sonra normal haline döner.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
    setTimeout(() => {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }, 300);
  }

  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    await login(email, password);
    const updatedUser = useAuthStore.getState().user;
    if (updatedUser?.role === 'Admin') navigate('/admin/dashboard');
    else navigate('/user/surveys');
  } catch {
    setError(tx(language, t.login.errInvalid));
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
  <LanguageToggle />
  <ThemeToggle />
</div>
        <div className="login-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="#2563EB"/>
            <path d="M10 12h20M10 18h14M10 24h17M10 30h11" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="31" cy="27" r="6" fill="#10B981"/>
            <path d="M28 27l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>SurveyApp</h1>
        </div>
        <p className="login-subtitle">{tx(language, t.login.subtitle)}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{tx(language, t.login.email)}</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={tx(language, t.login.emailPh)} required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{tx(language, t.login.password)}</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner"></span> : tx(language, t.login.submit)}
          </button>
        </form>

        <div className="login-hint">
          <p>{tx(language, t.login.demoHint)} <strong>admin@surveyapp.com</strong> / <strong>Admin123!</strong></p>
        </div>
      </div>
    </div>
  );
}
