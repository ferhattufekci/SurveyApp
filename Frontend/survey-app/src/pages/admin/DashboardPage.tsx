import { useEffect, useState } from 'react';
import { surveysApi, questionsApi, usersApi, answerTemplatesApi } from '../../api';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({ surveys: 0, questions: 0, users: 0, templates: 0 });
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      surveysApi.getAll(),
      questionsApi.getAll(),
      usersApi.getAll(),
      answerTemplatesApi.getAll(),
    ]).then(([s, q, u, t]) => {
      setStats({ surveys: s.length, questions: q.length, users: u.length, templates: t.length });
      setSurveys(s.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Anket yönetim sistemine hoş geldiniz</p>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Toplam Anket', value: stats.surveys, icon: '📝', color: 'blue', link: '/admin/surveys' },
          { label: 'Toplam Soru', value: stats.questions, icon: '❓', color: 'green', link: '/admin/questions' },
          { label: 'Kullanıcılar', value: stats.users, icon: '👥', color: 'purple', link: '/admin/users' },
          { label: 'Cevap Şablonları', value: stats.templates, icon: '📋', color: 'orange', link: '/admin/answer-templates' },
        ].map(stat => (
          <Link to={stat.link} key={stat.label} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Son Anketler</h2>
          <Link to="/admin/surveys" className="btn btn-sm btn-outline">Tümünü Gör</Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Atanan</th>
                <th>Yanıtlayan</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s: any) => (
                <tr key={s.id}>
                  <td><Link to={`/admin/surveys/${s.id}`}>{s.title}</Link></td>
                  <td>{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                  <td>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                  <td>{s.assignedUserCount}</td>
                  <td>{s.responseCount}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>
                      {s.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
