import { useEffect, useState } from 'react';
import { surveysApi, questionsApi, usersApi, answerTemplatesApi } from '../../api';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 5;

function MiniPagination({
  total, page, onPage,
}: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 16px', borderTop: '1px solid #e5e7eb' }}>
      <button
        onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
        style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: page === 1 ? '#f9fafb' : '#fff', cursor: page === 1 ? 'default' : 'pointer', color: '#374151' }}>‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onPage(p)}
          style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: p === page ? '#6366f1' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>{p}</button>
      ))}
      <button
        onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages}
        style={{ padding: '3px 9px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: page === pages ? '#f9fafb' : '#fff', cursor: page === pages ? 'default' : 'pointer', color: '#374151' }}>›</button>
      <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9ca3af' }}>{total} kayıt</span>
    </div>
  );
}

export default function DashboardPage() {
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
    ]).then(([s, q, u, t]) => {
      setAllData({ surveys: s, questions: q, users: u, templates: t });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  const { surveys, questions, users, templates } = allData;
  const now = new Date();

  /* ── Anket kümeleri ── */
  const activeSurveys  = surveys.filter(s => s.isActive && new Date(s.endDate) >= now);
  const expiredSurveys = surveys.filter(s => s.isActive && new Date(s.endDate) < now);
  const passiveSurveys = surveys.filter(s => !s.isActive);

  /* ── Stat sayıları ── */
  const sq = { total: surveys.length,   active: activeSurveys.length, passive: passiveSurveys.length, expired: expiredSurveys.length };
  const qq = { total: questions.length, active: questions.filter((q: any) => q.isActive).length, passive: questions.filter((q: any) => !q.isActive).length };
  const uu = { total: users.length,     active: users.filter((u: any) => u.isActive).length,     passive: users.filter((u: any) => !u.isActive).length };
  const tt = { total: templates.length, active: templates.filter((t: any) => t.isActive).length, passive: templates.filter((t: any) => !t.isActive).length };

  /* ── Pagination ── */
  const activeSlice  = activeSurveys.slice((activePage - 1) * PAGE_SIZE,  activePage * PAGE_SIZE);
  const expiredSlice = expiredSurveys.slice((expiredPage - 1) * PAGE_SIZE, expiredPage * PAGE_SIZE);

  /* ── Yardımcı: stat pill ── */
  const statCards = [
    {
      label: 'Anketler', icon: '📝', total: sq.total,
      active: sq.active, passive: sq.passive, extra: sq.expired,
      extraLabel: 'Süresi Geçmiş', link: '/admin/surveys',
      bg: '#eef2ff', border: '#6366f122', accent: '#6366f1',
    },
    {
      label: 'Sorular', icon: '❓', total: qq.total,
      active: qq.active, passive: qq.passive, extra: null,
      extraLabel: '', link: '/admin/questions',
      bg: '#f0fdf4', border: '#10b98122', accent: '#10b981',
    },
    {
      label: 'Kullanıcılar', icon: '👥', total: uu.total,
      active: uu.active, passive: uu.passive, extra: null,
      extraLabel: '', link: '/admin/users',
      bg: '#faf5ff', border: '#8b5cf622', accent: '#8b5cf6',
    },
    {
      label: 'Cevap Şablonları', icon: '📋', total: tt.total,
      active: tt.active, passive: tt.passive, extra: null,
      extraLabel: '', link: '/admin/answer-templates',
      bg: '#fffbeb', border: '#f59e0b22', accent: '#f59e0b',
    },
  ];

  const pillBase: React.CSSProperties = {
    borderRadius: '7px', padding: '4px 10px', fontSize: '12px',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Anket yönetim sistemine hoş geldiniz</p>
        </div>
      </div>

      {/* ── Stat kartları ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {statCards.map(c => (
          <Link key={c.label} to={c.link} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.accent}`,
            borderRadius: '12px', padding: '16px 18px', textDecoration: 'none', color: 'inherit',
            transition: 'transform 0.15s, box-shadow 0.15s', display: 'block',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
          >
            {/* Başlık satırı */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{c.icon}</span>
              <span style={{ fontWeight: 600, color: '#4b5563', fontSize: '14px' }}>{c.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '30px', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.total}</span>
            </div>
            {/* Pill'ler */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ ...pillBase, background: '#dcfce7', color: '#15803d' }}>✅ {c.active} Aktif</span>
              <span style={{ ...pillBase, background: '#f3f4f6', color: '#6b7280' }}>⏸ {c.passive} Pasif</span>
              {c.extra !== null && (
                <span style={{ ...pillBase, background: '#fef3c7', color: '#b45309' }}>⚠️ {c.extra} {c.extraLabel}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ── İki sütun: Devam Eden + Süresi Geçen ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Devam Eden Anketler */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Devam Eden Anketler
              <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280', marginLeft: '4px' }}>({activeSurveys.length})</span>
            </h2>
            <Link to="/admin/surveys" className="btn btn-sm btn-outline">Tümünü Gör</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Durum</th><th>Başlık</th><th>Bitiş</th><th>Atanan</th><th>Yanıt</th></tr>
              </thead>
              <tbody>
                {activeSlice.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>Devam eden anket yok</td></tr>
                ) : activeSlice.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{(activePage - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className="badge badge-success">Aktif</span></td>
                    <td>
                      <Link to="/admin/surveys" style={{ fontWeight: 600, color: '#4b5563', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#6366f1'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}>
                        {s.title.length > 30 ? s.title.substring(0, 30) + '…' : s.title}
                      </Link>
                    </td>
                    <td style={{ fontSize: '13px', color: '#6b7280' }}>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                    <td><span className="badge badge-info">{s.assignedUserCount}</span></td>
                    <td><span className="badge badge-success">{s.responseCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MiniPagination total={activeSurveys.length} page={activePage} onPage={setActivePage} />
        </div>

        {/* Süresi Geçen Anketler */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Süresi Geçen Anketler
              <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280', marginLeft: '4px' }}>({expiredSurveys.length})</span>
            </h2>
            <Link to="/admin/surveys" className="btn btn-sm btn-outline">Tümünü Gör</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Durum</th><th>Başlık</th><th>Bitiş</th><th>Atanan</th><th>Yanıt</th></tr>
              </thead>
              <tbody>
                {expiredSlice.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>Süresi geçen anket yok</td></tr>
                ) : expiredSlice.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{(expiredPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td><span className="badge badge-warning">Süresi Geçti</span></td>
                    <td>
                      <Link to="/admin/surveys" style={{ fontWeight: 600, color: '#4b5563', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#6366f1'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}>
                        {s.title.length > 30 ? s.title.substring(0, 30) + '…' : s.title}
                      </Link>
                    </td>
                    <td style={{ fontSize: '13px', color: '#6b7280' }}>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                    <td><span className="badge badge-info">{s.assignedUserCount}</span></td>
                    <td><span className="badge badge-success">{s.responseCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MiniPagination total={expiredSurveys.length} page={expiredPage} onPage={setExpiredPage} />
        </div>
      </div>

      {/* ── Bilgi kartı ── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
        padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
      }}>
        {[
          { icon: '🔒', title: 'Silme Kuralları', lines: ['Ankete atanan kullanıcılar silinemez', 'Ankette kullanılan sorular silinemez', 'Sorularda kullanılan şablonlar silinemez'] },
          { icon: '✏️', title: 'Düzenleme Kuralları', lines: ['Yanıt alınan anketler düzenlenemez', 'Süresi geçmiş anketler düzenlenemez', 'Aktif ankete atanmış kullanıcı pasife alınamaz'] },
          { icon: '⚠️', title: 'Pasife Alma Kuralları', lines: ['Aktif sorularda kullanılan şablon pasife alınamaz', 'Aktif ankette kullanılan soru pasife alınamaz', 'Pasif kullanıcı ve soru ankete eklenemez'] },
          { icon: '💡', title: 'Genel Bilgi', lines: [`${uu.active} aktif / ${uu.passive} pasif kullanıcı`, `${qq.active} aktif / ${qq.passive} pasif soru`, `${tt.active} aktif / ${tt.passive} pasif şablon`] },
        ].map(card => (
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
