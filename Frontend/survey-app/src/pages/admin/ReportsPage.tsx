import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reportsApi } from '../../api';
import type { SurveyListItem, SurveyReport } from '../../types';

export function ReportsListPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { reportsApi.getAll().then(setSurveys).finally(() => setLoading(false)); }, []);

  const filtered = surveys.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Raporlar</h1><p>Anket tamamlanma durumlarını inceleyin</p></div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Anket ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Anket</th><th>Tarih Aralığı</th><th>Atanan</th><th>Tamamlayan</th><th>Tamamlamayan</th><th>Oran</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const rate = s.assignedUserCount > 0 ? Math.round((s.responseCount / s.assignedUserCount) * 100) : 0;
                return (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.title}</strong>
                      <span className={`badge ml-2 ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>{s.isActive ? 'Aktif' : 'Pasif'}</span>
                    </td>
                    <td className="text-sm">
                      {new Date(s.startDate).toLocaleDateString('tr-TR')} - {new Date(s.endDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td>{s.assignedUserCount}</td>
                    <td><span className="text-success">{s.responseCount}</span></td>
                    <td><span className="text-danger">{s.assignedUserCount - s.responseCount}</span></td>
                    <td>
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${rate}%` }}></div>
                        <span>{rate}%</span>
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
      </div>
    </div>
  );
}

export function SurveyReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SurveyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'completed' | 'pending'>('completed');
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  useEffect(() => {
    reportsApi.getSurveyReport(Number(id)).then(setReport).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;
  if (!report) return <div className="page"><div className="alert alert-error">Rapor bulunamadı.</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/admin/reports" className="back-link">← Raporlar</Link>
          <h1>{report.title}</h1>
        </div>
      </div>

      <div className="stats-grid stats-grid-3">
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
