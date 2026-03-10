import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { surveysApi, questionsApi, usersApi } from '../../api';
import type { SurveyListItem, QuestionListItem, User } from '../../types';

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', startDate: '', endDate: '',
    isActive: true, questionIds: [] as number[], userIds: [] as number[]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () =>
    Promise.all([surveysApi.getAll(), questionsApi.getAll(), usersApi.getAll()])
      .then(([s, q, u]) => { setSurveys(s); setQuestions(q); setUsers(u.filter((u: User) => u.role === 'User')); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', startDate: '', endDate: '', isActive: true, questionIds: [], userIds: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = async (id: number) => {
    const detail = await surveysApi.getById(id);
    setEditItem(detail);
    setForm({
      title: detail.title, description: detail.description,
      startDate: detail.startDate.substring(0, 10), endDate: detail.endDate.substring(0, 10),
      isActive: detail.isActive,
      questionIds: detail.questions.map((q: any) => q.questionId),
      userIds: detail.assignedUserIds
    });
    setError('');
    setShowModal(true);
  };

  const toggleQuestion = (id: number) => {
    setForm(f => ({
      ...f, questionIds: f.questionIds.includes(id) ? f.questionIds.filter(q => q !== id) : [...f.questionIds, id]
    }));
  };

  const toggleUser = (id: number) => {
    setForm(f => ({
      ...f, userIds: f.userIds.includes(id) ? f.userIds.filter(u => u !== id) : [...f.userIds, id]
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Anket başlığı zorunludur.'); return; }
    if (!form.startDate || !form.endDate) { setError('Tarihler zorunludur.'); return; }
    if (form.questionIds.length === 0) { setError('En az bir soru seçiniz.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
      if (editItem) await surveysApi.update(editItem.id, payload);
      else await surveysApi.create(payload);
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu anketi silmek istediğinize emin misiniz?')) return;
    await surveysApi.delete(id);
    load();
  };

  const filtered = surveys.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Anketler</h1><p>Anketleri oluşturun ve yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Anket</button>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Anket ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="record-count">{filtered.length} anket</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Başlık</th><th>Başlangıç</th><th>Bitiş</th><th>Atanan</th><th>Yanıtlayan</th><th>Durum</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.title}</strong><br/><small className="text-muted">{s.description.substring(0, 50)}{s.description.length > 50 ? '...' : ''}</small></td>
                  <td>{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                  <td>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                  <td><span className="badge badge-info">{s.assignedUserCount} kişi</span></td>
                  <td><span className="badge badge-success">{s.responseCount} yanıt</span></td>
                  <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>{s.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td>
                    <div className="action-btns">
                      <Link to={`/admin/reports/${s.id}`} className="btn btn-sm btn-info">Rapor</Link>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(s.id)}>Düzenle</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
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
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
