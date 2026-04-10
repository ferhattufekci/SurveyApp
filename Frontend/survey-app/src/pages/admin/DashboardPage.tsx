import { useEffect, useState } from 'react';
import { surveysApi, questionsApi, usersApi, answerTemplatesApi } from '../../api';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';

const PAGE_SIZE = 5;

function PieChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#9ca3af' }}>
      —
    </div>
  );

  let cumulative = 0;
  const paths = slices.map(slice => {
    if (slice.value === 0) return null;
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += slice.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const r = 54;
    const x1 = 60 + r * Math.cos(startAngle);
    const y1 = 60 + r * Math.sin(startAngle);
    const x2 = 60 + r * Math.cos(endAngle);
    const y2 = 60 + r * Math.sin(endAngle);
    const largeArc = slice.value / total > 0.5 ? 1 : 0;
    const d = `M 60 60 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={slice.label} d={d} fill={slice.color} stroke="#fff" strokeWidth="2" />;
  });

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {paths}
      <circle cx="60" cy="60" r="30" fill="white" />
      <text x="60" y="56" textAnchor="middle" fontSize="13" fontWeight="800" fill="#374151">{total}</text>
      <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#9ca3af">Anket</text>
    </svg>
  );
}

function MiniPagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 16px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: page === 1 ? '#f9fafb' : '#fff', cursor: page === 1 ? 'default' : 'pointer', color: '#374151' }}>‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)}
          style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: p === page ? '#6366f1' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>{p}</button>
      ))}
      <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages}
        style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: page === pages ? '#f9fafb' : '#fff', cursor: page === pages ? 'default' : 'pointer', color: '#374151' }}>›</button>
      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9ca3af' }}>{total}</span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const [allData, setAllData] = useState<{ surveys: any[]; questions: any[]; users: any[]; templates: any[] }>({
    surveys: [], questions: [], users: [], templates: [],
  });
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage]   = useState(1);
  const [expiredPage, setExpiredPage] = useState(1);

  useEffect(() => {
    Promise.all([
      surveysApi.getAll(),
      questionsApi.getAll(),
      usersApi.getAll(),
      answerTemplatesApi.getAll(),
    ]).then(([s, q, u, tpl]) => setAllData({ surveys: s, questions: q, users: u, templates: tpl }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  const { surveys, questions, users, templates } = allData;
  const now = new Date();

  const activeSurveys  = surveys.filter(s => s.isActive && new Date(s.endDate) >= now);
  const expiredSurveys = surveys.filter(s => s.isActive && new Date(s.endDate) < now);
  const passiveSurveys = surveys.filter(s => !s.isActive);

  const sq = { total: surveys.length,   active: activeSurveys.length,  passive: passiveSurveys.length, expired: expiredSurveys.length };
  const qq = { total: questions.length, active: questions.filter((q: any) => q.isActive).length,  passive: questions.filter((q: any) => !q.isActive).length };
  const uu = { total: users.length,     active: users.filter((u: any) => u.isActive).length,      passive: users.filter((u: any) => !u.isActive).length };
  const tt = { total: templates.length, active: templates.filter((t: any) => t.isActive).length,  passive: templates.filter((t: any) => !t.isActive).length };

  const activeSlice  = activeSurveys.slice((activePage - 1)  * PAGE_SIZE, activePage  * PAGE_SIZE);
  const expiredSlice = expiredSurveys.slice((expiredPage - 1) * PAGE_SIZE, expiredPage * PAGE_SIZE);

  const statCards = [
    { label: tx(language, t.nav.answerTemplates), icon: '📋', total: tt.total, active: tt.active, passive: tt.passive, extra: null,        extraLabel: '',                               link: '/admin/answer-templates', bg: '#fffbeb', border: '#f59e0b22', accent: '#f59e0b' },
    { label: tx(language, t.nav.questions),       icon: '❓', total: qq.total, active: qq.active, passive: qq.passive, extra: null,        extraLabel: '',                               link: '/admin/questions',         bg: '#f0fdf4', border: '#10b98122', accent: '#10b981' },
    { label: tx(language, t.nav.surveys),         icon: '📝', total: sq.total, active: sq.active, passive: sq.passive, extra: sq.expired, extraLabel: tx(language, t.dashboard.expired), link: '/admin/surveys',           bg: '#eef2ff', border: '#6366f122', accent: '#6366f1' },
    { label: tx(language, t.nav.users),           icon: '👥', total: uu.total, active: uu.active, passive: uu.passive, extra: null,        extraLabel: '',                               link: '/admin/users',             bg: '#faf5ff', border: '#8b5cf622', accent: '#8b5cf6' },
  ];

  const pillBase: React.CSSProperties = {
    borderRadius: '7px', padding: '4px 10px', fontSize: '12px',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
  };

  const goToSurveys = (title: string) => navigate(`/admin/surveys?search=${encodeURIComponent(title)}`);

  const renderSurveyRow = (s: any, rowNum: number) => (
    <>
      <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
      <td>
        <span className={`badge ${s.isActive && new Date(s.endDate) >= now ? 'badge-success' : 'badge-warning'}`}>
          {s.isActive && new Date(s.endDate) >= now ? tx(language, t.surveys.statusActive) : tx(language, t.surveys.statusExpired)}
        </span>
      </td>
      <td>
        <button onClick={() => goToSurveys(s.title)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: '#4b5563', fontSize: '13px', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'color 0.15s', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6366f1'; (e.currentTarget as HTMLElement).style.textDecorationColor = '#6366f1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4b5563'; (e.currentTarget as HTMLElement).style.textDecorationColor = 'transparent'; }}
        >
          {s.title}
        </button>
      </td>
      <td style={{ fontSize: '13px', color: '#6b7280' }}>{new Date(s.endDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB')}</td>
      <td><span className="badge badge-info">{s.assignedUserCount}</span></td>
      <td><span className="badge badge-success">{s.responseCount}</span></td>
    </>
  );

  const infoCards = [
    {
      icon: '🔒', title: tx(language, t.dashboard.deleteRules),
      lines: [tx(language, t.dashboard.deleteRule1), tx(language, t.dashboard.deleteRule2), tx(language, t.dashboard.deleteRule3)],
    },
    {
      icon: '✏️', title: tx(language, t.dashboard.editRules),
      lines: [tx(language, t.dashboard.editRule1), tx(language, t.dashboard.editRule2), tx(language, t.dashboard.editRule3)],
    },
    {
      icon: '⚠️', title: tx(language, t.dashboard.passiveRules),
      lines: [tx(language, t.dashboard.passiveRule1), tx(language, t.dashboard.passiveRule2), tx(language, t.dashboard.passiveRule3)],
    },
    {
      icon: '💡', title: tx(language, t.dashboard.generalInfo),
      lines: [
        `${uu.active} ${tx(language, t.common.active).toLowerCase()} / ${uu.passive} ${tx(language, t.common.passive).toLowerCase()} ${tx(language, t.nav.users).toLowerCase()}`,
        `${qq.active} ${tx(language, t.common.active).toLowerCase()} / ${qq.passive} ${tx(language, t.common.passive).toLowerCase()} ${tx(language, t.nav.questions).toLowerCase()}`,
        `${tt.active} ${tx(language, t.common.active).toLowerCase()} / ${tt.passive} ${tx(language, t.common.passive).toLowerCase()} ${language === 'tr' ? 'şablon' : 'templates'}`,
      ],
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>{tx(language, t.dashboard.title)}</h1>
      </div>

      {/* ── Stat kartları — CSS class kullanıyoruz, media query çalışsın ── */}
      <div className="stat-cards-grid-4">
        {statCards.map(c => (
          <Link key={c.label} to={c.link} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.accent}`,
            borderRadius: '12px', padding: '16px 18px', textDecoration: 'none', color: 'inherit',
            transition: 'transform 0.15s, box-shadow 0.15s', display: 'block',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{c.icon}</span>
              <span style={{ fontWeight: 600, color: '#4b5563', fontSize: '14px' }}>{c.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '30px', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.total}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ ...pillBase, background: '#dcfce7', color: '#15803d' }}>✅ {c.active} {tx(language, t.common.active)}</span>
              <span style={{ ...pillBase, background: '#f3f4f6', color: '#6b7280' }}>⏸ {c.passive} {tx(language, t.common.passive)}</span>
              {c.extra !== null && <span style={{ ...pillBase, background: '#fef3c7', color: '#b45309' }}>⚠️ {c.extra} {c.extraLabel}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Orta bölüm: pasta + 2 tablo — CSS class ile responsive ── */}
      <div className="dashboard-mid-grid">

        {/* Pasta grafik — .dashboard-pie-col sayesinde tablet/mobilde gizlenir */}
        <div className="dashboard-pie-col">
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '12px' }}>{tx(language, t.dashboard.surveyStatus)}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <PieChart slices={[
              { value: activeSurveys.length,  color: '#10b981', label: tx(language, t.dashboard.ongoing) },
              { value: expiredSurveys.length, color: '#f59e0b', label: tx(language, t.dashboard.expired) },
              { value: passiveSurveys.length, color: '#d1d5db', label: tx(language, t.dashboard.passive) },
            ]} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: tx(language, t.dashboard.ongoing), value: activeSurveys.length,  color: '#10b981' },
              { label: tx(language, t.dashboard.expired), value: expiredSurveys.length, color: '#f59e0b' },
              { label: tx(language, t.dashboard.passive), value: passiveSurveys.length, color: '#d1d5db' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, flexShrink: 0 }} />
                <span style={{ color: '#6b7280', flex: 1 }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: '#374151' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devam Eden */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {tx(language, t.dashboard.ongoing)}
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280' }}>({activeSurveys.length})</span>
            </h2>
            <Link to="/admin/surveys?filter=active" className="btn btn-sm btn-outline">{tx(language, t.dashboard.viewAll)}</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{tx(language, t.common.status)}</th>
                  <th>{tx(language, t.surveys.colTitle)}</th>
                  <th>{tx(language, t.dashboard.endDate)}</th>
                  <th>{tx(language, t.dashboard.assigned)}</th>
                  <th>{tx(language, t.dashboard.response)}</th>
                </tr>
              </thead>
              <tbody>
                {activeSlice.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>{tx(language, t.dashboard.noOngoing)}</td></tr>
                  : activeSlice.map((s: any, i: number) => <tr key={s.id}>{renderSurveyRow(s, (activePage - 1) * PAGE_SIZE + i + 1)}</tr>)
                }
              </tbody>
            </table>
          </div>
          <MiniPagination total={activeSurveys.length} page={activePage} onPage={setActivePage} />
        </div>

        {/* Süresi Geçen */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              {tx(language, t.dashboard.expired)}
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280' }}>({expiredSurveys.length})</span>
            </h2>
            <Link to="/admin/surveys?filter=expired" className="btn btn-sm btn-outline">{tx(language, t.dashboard.viewAll)}</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{tx(language, t.common.status)}</th>
                  <th>{tx(language, t.surveys.colTitle)}</th>
                  <th>{tx(language, t.dashboard.endDate)}</th>
                  <th>{tx(language, t.dashboard.assigned)}</th>
                  <th>{tx(language, t.dashboard.response)}</th>
                </tr>
              </thead>
              <tbody>
                {expiredSlice.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>{tx(language, t.dashboard.noExpired)}</td></tr>
                  : expiredSlice.map((s: any, i: number) => <tr key={s.id}>{renderSurveyRow(s, (expiredPage - 1) * PAGE_SIZE + i + 1)}</tr>)
                }
              </tbody>
            </table>
          </div>
          <MiniPagination total={expiredSurveys.length} page={expiredPage} onPage={setExpiredPage} />
        </div>
      </div>

      {/* ── Kural kartları — CSS class ile responsive ── */}
      <div className="dashboard-rules-grid">
        {infoCards.map(card => (
          <div key={card.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>{card.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{card.title}</span>
            </div>
            {card.lines.map(line => (
              <div key={line} style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', paddingLeft: '4px' }}>· {line}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
