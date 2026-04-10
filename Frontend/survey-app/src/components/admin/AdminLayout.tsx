import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';
import LanguageToggle from './LanguageToggle';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const { language } = useLanguageStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin/dashboard',        label: tx(language, t.nav.dashboard),       icon: '📊' },
    { path: '/admin/answer-templates', label: tx(language, t.nav.answerTemplates), icon: '📋' },
    { path: '/admin/questions',        label: tx(language, t.nav.questions),        icon: '❓' },
    { path: '/admin/surveys',          label: tx(language, t.nav.surveys),          icon: '📝' },
    { path: '/admin/users',            label: tx(language, t.nav.users),            icon: '👥' },
    { path: '/admin/reports',          label: tx(language, t.nav.reports),          icon: '📈' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Mobil overlay — sidebar açıkken arka planı karartır */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 99,
          }}
          className="mob-overlay"
        />
      )}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563EB"/>
              <path d="M8 10h16M8 15h11M8 20h13M8 25h9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="25" cy="22" r="5" fill="#10B981"/>
              <path d="M23 22l1.5 1.5L27 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {sidebarOpen && <span>SurveyApp</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.fullName?.[0]?.toUpperCase()}</div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name" title={user?.fullName || ''}>{user?.fullName}</span>
                <span className="user-role">Admin</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            {sidebarOpen && <LanguageToggle />}
            <button onClick={handleLogout} title={tx(language, t.common.logout)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}>
              {sidebarOpen ? `🚪 ${tx(language, t.common.logout)}` : '🚪'}
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        {/* Mobil üst bar — sadece küçük ekranda görünür */}
        <div className="mobile-topbar" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--gray-200)', position: 'sticky', top: 0, zIndex: 50 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--gray-600)', padding: '4px', lineHeight: 1 }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 32 32" fill="none" style={{ width: 24, height: 24 }}>
              <rect width="32" height="32" rx="8" fill="#2563EB"/>
              <path d="M8 10h16M8 15h11M8 20h13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>SurveyApp</span>
          </div>
          <LanguageToggle />
        </div>

        <style>{`
          .mobile-topbar { display: none; }
          @media (max-width: 768px) {
            .mobile-topbar { display: flex !important; }
            .mob-overlay   { display: block !important; }
          }
        `}</style>

        <Outlet />
      </main>
    </div>
  );
}
