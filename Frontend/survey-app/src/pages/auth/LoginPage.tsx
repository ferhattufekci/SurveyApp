import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser?.role === 'Admin') navigate('/admin/dashboard');
      else navigate('/user/surveys');
    } catch {
      setError('Geçersiz e-posta veya şifre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="#2563EB"/>
            <path d="M10 12h20M10 18h14M10 24h17M10 30h11" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="31" cy="27" r="6" fill="#10B981"/>
            <path d="M28 27l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>SurveyApp</h1>
        </div>
        <p className="login-subtitle">Hesabınıza giriş yapın</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ornek@email.com" required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Giriş Yap'}
          </button>
        </form>

        <div className="login-hint">
          <p>Demo Admin: <strong>admin@surveyapp.com</strong> / <strong>Admin123!</strong></p>
        </div>
      </div>
    </div>
  );
}
