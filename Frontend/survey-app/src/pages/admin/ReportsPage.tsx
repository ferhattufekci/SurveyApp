import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { reportsApi } from '../../api';
import type { SurveyListItem, SurveyReport } from '../../types';
import SearchInput from '../../components/admin/SearchInput';

const PAGE_SIZE = 8;

function progressColor(rate: number): string {
  if (rate === 0) return '#e5e7eb';        // gri — hiç yanıt yok
  if (rate < 40)  return '#ef4444';        // kırmızı
  if (rate < 75)  return '#f59e0b';        // turuncu/sarı
  return '#10b981';                         // yeşil
}

export function ReportsListPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  useEffect(() => { reportsApi.getAll().then(setSurveys).finally(() => setLoading(false)); }, []);

  const filtered = surveys.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Raporlar</h1><p>Anket tamamlanma durumlarını inceleyin</p></div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput
            value={search}
            placeholder="Anket ara..."
            onChange={v => { setSearch(v); setPage(1); }}
          />
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Anket</th>
                <th>Tarih Aralığı</th>
                <th>Atanan</th>
                <th>Tamamlayan</th>
                <th>Tamamlamayan</th>
                <th>Oran</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => {
                const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                const rate = s.assignedUserCount > 0
                  ? Math.round((s.responseCount / s.assignedUserCount) * 100)
                  : 0;
                const barColor = progressColor(rate);
                return (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                    <td>
                      <strong>{s.title}</strong>
                      <span className={`badge ml-2 ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>
                        {s.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="text-sm">
                      {new Date(s.startDate).toLocaleDateString('tr-TR')} - {new Date(s.endDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td>{s.assignedUserCount}</td>
                    <td><span className="text-success">{s.responseCount}</span></td>
                    <td><span className="text-danger">{s.assignedUserCount - s.responseCount}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '10px', background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: barColor, borderRadius: '10px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: barColor, minWidth: '36px', textAlign: 'right' }}>
                          {rate}%
                        </span>
                      </div>
                    </td>
                    <td><Link to={`/admin/reports/${s.id}`} className="btn btn-sm btn-primary">Detay</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Anket bulunamadı.</div>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} anket — {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹ Önceki</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(p)} style={{ minWidth: '36px' }}>{p}</button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Sonraki ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SurveyReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport]   = useState<SurveyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState<'completed' | 'pending'>('completed');
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  useEffect(() => {
    reportsApi.getSurveyReport(Number(id)).then(setReport).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;
  if (!report) return <div className="page"><div className="alert alert-error">Rapor bulunamadı.</div></div>;

  const rate = report.totalAssigned > 0 ? Math.round((report.totalCompleted / report.totalAssigned) * 100) : 0;
  const barColor = progressColor(rate);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/admin/reports" className="back-link">← Raporlar</Link>
          {/* Anket adı → Anketler sayfasına başlık filtreli git */}
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/admin/surveys?search=${encodeURIComponent(report.title)}`)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit',
                textDecoration: 'underline', textDecorationColor: '#6366f1',
                textUnderlineOffset: '4px',
              }}
              title="Anketler sayfasında görüntüle"
            >
              {report.title}
            </button>
            <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280', textDecoration: 'none' }}>
              🔗 Ankete git
            </span>
          </h1>
        </div>
      </div>

      {/* Özet stat kartları + oran */}
      <div className="stats-grid stats-grid-3" style={{ marginBottom: '12px' }}>
        <div className="stat-card stat-blue">
          <div className="stat-icon">👥</div>
          <div className="stat-info"><div className="stat-value">{report.totalAssigned}</div><div className="stat-label">Toplam Atanan</div></div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon">✅</div>
          <div className="stat-info"><div className="stat-value">{report.totalCompleted}</div><div className="stat-label">Tamamlayan</div></div>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-info"><div className="stat-value">{report.totalPending}</div><div className="stat-label">Tamamlamayan</div></div>
        </div>
      </div>

      {/* Tamamlanma oranı */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>Tamamlanma Oranı</span>
        <div style={{ flex: 1, height: '10px', borderRadius: '10px', background: '#e5e7eb', overflow: 'hidden' }}>
          <div style={{ width: `${rate}%`, height: '100%', background: barColor, borderRadius: '10px', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: '18px', fontWeight: 800, color: barColor, minWidth: '48px', textAlign: 'right' }}>{rate}%</span>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            Tamamlayanlar ({report.totalCompleted})
          </button>
          <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            Tamamlamayanlar ({report.totalPending})
          </button>
        </div>

        {activeTab === 'completed' && (
          <div className="response-list">
            {report.completedResponses.map((r, i) => (
              <div key={i} className="response-item">
                <div className="response-header" onClick={() => setExpandedUser(expandedUser === i ? null : i)}>
                  <div className="user-cell">
                    <div className="user-avatar-sm">{r.userName[0]?.toUpperCase()}</div>
                    <div>
                      <strong>{r.userName}</strong>
                      <span className="text-muted ml-2">{r.userEmail}</span>
                    </div>
                  </div>
                  <div className="response-meta">
                    <span className="text-muted">{new Date(r.submittedAt).toLocaleString('tr-TR')}</span>
                    <span className="expand-icon">{expandedUser === i ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedUser === i && (
                  <div className="response-answers">
                    {r.answers.map((a, j) => (
                      <div key={j} className="answer-row">
                        <div className="answer-question">{a.questionText}</div>
                        <div className="answer-value">{a.answerText}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {report.completedResponses.length === 0 && <div className="empty-state">Henüz yanıt yok.</div>}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Ad Soyad</th><th>E-posta</th></tr></thead>
              <tbody>
                {report.pendingUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-sm">{u.fullName[0]?.toUpperCase()}</div>
                        {u.fullName}
                      </div>
                    </td>
                    <td>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.pendingUsers.length === 0 && <div className="empty-state">Herkes tamamlamış! 🎉</div>}
          </div>
        )}
      </div>
    </div>
  );
}
