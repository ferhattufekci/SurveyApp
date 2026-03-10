import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { surveysApi, questionsApi, usersApi } from '../../api';
import type { SurveyListItem, QuestionListItem, User } from '../../types';

type FilterKey = 'all' | 'active' | 'passive' | 'expired';

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '', isActive: true, questionIds: [] as number[], userIds: [] as number[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const load = () =>
    Promise.all([surveysApi.getAll(), questionsApi.getAll(), usersApi.getAll()])
      .then(([s, q, u]) => { setSurveys(s); setQuestions(q); setUsers(u.filter((u: User) => u.role === 'User')); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', startDate: '', endDate: '', isActive: true, questionIds: [], userIds: [] });
    setError(''); setShowModal(true);
  };
  const openEdit = async (id: number) => {
    const detail = await surveysApi.getById(id);
    setEditItem(detail);
    setForm({ title: detail.title, description: detail.description, startDate: detail.startDate.substring(0, 10), endDate: detail.endDate.substring(0, 10), isActive: detail.isActive, questionIds: detail.questions.map((q: any) => q.questionId), userIds: detail.assignedUserIds });
    setError(''); setShowModal(true);
  };
  const toggleQuestion = (id: number) => setForm(f => ({ ...f, questionIds: f.questionIds.includes(id) ? f.questionIds.filter(q => q !== id) : [...f.questionIds, id] }));
  const toggleUser = (id: number) => setForm(f => ({ ...f, userIds: f.userIds.includes(id) ? f.userIds.filter(u => u !== id) : [...f.userIds, id] }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Anket başlığı zorunludur.'); return; }
    if (!form.startDate || !form.endDate) { setError('Tarihler zorunludur.'); return; }
    if (form.questionIds.length === 0) { setError('En az bir soru seçiniz.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
      if (editItem) await surveysApi.update(editItem.id, payload);
      else await surveysApi.create(payload);
      setShowModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu anketi silmek istediğinize emin misiniz?')) return;
    await surveysApi.delete(id); load();
  };

  const handleFilterClick = (key: FilterKey) => { setActiveFilter(prev => prev === key ? 'all' : key); setSearch(''); };

  const now = new Date();
  const totalCount   = surveys.length;
  const activeCount  = surveys.filter(s => s.isActive).length;
  const passiveCount = surveys.filter(s => !s.isActive).length;
  const expiredCount = surveys.filter(s => s.isActive && new Date(s.endDate) < now).length;
  const totalAssigned  = surveys.reduce((sum, s) => sum + s.assignedUserCount, 0);
  const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);

  const filtered = surveys.filter(s => {
    const isExpired = s.isActive && new Date(s.endDate) < now;
    const passesFilter =
      activeFilter === 'active'  ? s.isActive && !isExpired :
      activeFilter === 'passive' ? !s.isActive :
      activeFilter === 'expired' ? isExpired : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const durum = !s.isActive ? 'pasif' : isExpired ? 'süresi geçmiş' : 'aktif';
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || durum.includes(q);
  });

  const pillStyle = (key: FilterKey, activeBg: string, activeColor: string, inactiveBg: string, inactiveColor: string) => ({
    flex: 1, background: activeFilter === key ? activeBg : inactiveBg,
    color: activeFilter === key ? activeColor : inactiveColor,
    borderRadius: '8px', padding: '6px 10px', textAlign: 'center' as const,
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    border: activeFilter === key ? `2px solid ${activeColor}` : '2px solid transparent',
    transition: 'all 0.15s', userSelect: 'none' as const,
  });

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Anketler</h1><p>Anketleri oluşturun ve yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Anket</button>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>

        {/* Anket durumu */}
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Toplam Anket</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} Aktif</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} Pasif</span>
            <span style={pillStyle('expired', '#b45309', '#fff', '#fef3c7', '#b45309')} onClick={() => handleFilterClick('expired')}>⚠️ {expiredCount} Süresi Geçmiş</span>
          </div>
        </div>

        {/* Katılım özeti */}
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Genel Katılım</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ flex: 1, background: '#dbeafe', color: '#1d4ed8', borderRadius: '8px', padding: '6px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
              👥 {totalAssigned} Atanan
            </span>
            <span style={{ flex: 1, background: '#dcfce7', color: '#15803d', borderRadius: '8px', padding: '6px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
              ✅ {totalResponses} Yanıtlayan
            </span>
            <span style={{ flex: 1, background: '#fee2e2', color: '#dc2626', borderRadius: '8px', padding: '6px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
              ⏳ {totalAssigned - totalResponses} Bekleyen
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Anket adı, açıklama veya durum ara..." value={search}
            onChange={e => { setSearch(e.target.value); setActiveFilter('all'); }} />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => setActiveFilter('all')}>Filtreyi Temizle ×</button>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Durum</th><th>Başlık</th><th>Başlangıç</th><th>Bitiş</th><th>Atanan</th><th>Yanıtlayan</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const isExpired = s.isActive && new Date(s.endDate) < now;
                const statusLabel = !s.isActive ? 'Pasif' : isExpired ? 'Süresi Geçti' : 'Aktif';
                const statusClass = !s.isActive ? 'badge-secondary' : isExpired ? 'badge-warning' : 'badge-success';
                return (
                  <tr key={s.id}>
                    <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <strong>{s.title}</strong><br/>
                      <small className="text-muted">{s.description.substring(0, 50)}{s.description.length > 50 ? '...' : ''}</small>
                    </td>
                    <td>{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                    <td>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                    <td><span className="badge badge-info">{s.assignedUserCount} kişi</span></td>
                    <td><span className="badge badge-success">{s.responseCount} yanıt</span></td>
                    <td>
                      <div className="action-btns">
                        <Link to={`/admin/reports/${s.id}`} className="btn btn-sm btn-info">Rapor</Link>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(s.id)}>Düzenle</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Anket bulunamadı.</div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Anketi Düzenle' : 'Yeni Anket'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>Başlık</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Anket başlığı" />
                </div>
                <div className="form-group">
                  <label>Durum</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Anket açıklaması" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Başlangıç Tarihi</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Bitiş Tarihi</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Sorular ({form.questionIds.length} seçili)</label>
                <div className="checkbox-list">
                  {questions.filter(q => q.isActive).map(q => (
                    <label key={q.id} className="checkbox-item">
                      <input type="checkbox" checked={form.questionIds.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                      <span>{q.text}</span>
                      <span className="pill ml-auto">{q.answerTemplateName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Kullanıcılar ({form.userIds.length} seçili)</label>
                <div className="checkbox-list">
                  {users.map(u => (
                    <label key={u.id} className="checkbox-item">
                      <input type="checkbox" checked={form.userIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                      <span>{u.fullName}</span>
                      <span className="text-muted ml-auto">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
