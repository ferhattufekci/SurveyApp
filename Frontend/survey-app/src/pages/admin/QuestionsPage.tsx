import { useEffect, useState } from 'react';
import { questionsApi, answerTemplatesApi } from '../../api';
import type { QuestionListItem, AnswerTemplate } from '../../types';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<QuestionListItem | null>(null);
  const [form, setForm] = useState({ text: '', answerTemplateId: 0, isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () =>
    Promise.all([questionsApi.getAll(), answerTemplatesApi.getAll()])
      .then(([q, t]) => { setQuestions(q); setTemplates(t); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ text: '', answerTemplateId: templates[0]?.id || 0, isActive: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (q: QuestionListItem) => {
    setEditItem(q);
    setForm({ text: q.text, answerTemplateId: q.answerTemplateId, isActive: q.isActive });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) { setError('Soru metni zorunludur.'); return; }
    if (!form.answerTemplateId) { setError('Cevap şablonu seçiniz.'); return; }
    setSaving(true);
    try {
      if (editItem) await questionsApi.update(editItem.id, form);
      else await questionsApi.create({ text: form.text, answerTemplateId: form.answerTemplateId });
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    await questionsApi.delete(id);
    load();
  };

  const filtered = questions.filter(q =>
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.answerTemplateName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sorular</h1>
          <p>Anketlerde kullanılacak soruları yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Soru</button>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input
            className="search-input"
            placeholder="Soru ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="record-count">{filtered.length} soru</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Soru Metni</th>
                <th>Cevap Şablonu</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={q.id}>
                  <td className="text-muted">{i + 1}</td>
                  <td>{q.text}</td>
                  <td><span className="pill">{q.answerTemplateName}</span></td>
                  <td><span className={`badge ${q.isActive ? 'badge-success' : 'badge-secondary'}`}>{q.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(q)}>Düzenle</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Soru bulunamadı.</div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Soruyu Düzenle' : 'Yeni Soru'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Soru Metni</label>
                <textarea
                  rows={3} value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  placeholder="Soru metnini giriniz..."
                />
              </div>
              <div className="form-group">
                <label>Cevap Şablonu</label>
                <select value={form.answerTemplateId} onChange={e => setForm(f => ({ ...f, answerTemplateId: Number(e.target.value) }))}>
                  <option value={0}>Şablon seçiniz...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.options.length} seçenek)</option>)}
                </select>
              </div>
              {editItem && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                    Aktif
                  </label>
                </div>
              )}
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
