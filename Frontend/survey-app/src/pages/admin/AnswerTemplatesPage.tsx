import { useEffect, useState } from 'react';
import { answerTemplatesApi } from '../../api';
import type { AnswerTemplate } from '../../types';

export default function AnswerTemplatesPage() {
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<AnswerTemplate | null>(null);
  const [form, setForm] = useState({ name: '', options: ['', ''] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => answerTemplatesApi.getAll().then(setTemplates).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', options: ['', ''] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (t: AnswerTemplate) => {
    setEditItem(t);
    setForm({ name: t.name, options: t.options.map(o => o.text) });
    setError('');
    setShowModal(true);
  };

  const addOption = () => {
    if (form.options.length < 4) setForm(f => ({ ...f, options: [...f.options, ''] }));
  };

  const removeOption = (i: number) => {
    if (form.options.length > 2) setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  };

  const updateOption = (i: number, val: string) => {
    setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? val : o) }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Şablon adı zorunludur.'); return; }
    if (form.options.some(o => !o.trim())) { setError('Tüm seçenekler doldurulmalıdır.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await answerTemplatesApi.update(editItem.id, {
          name: form.name,
          isActive: editItem.isActive,
          options: form.options.map((text, i) => ({ id: editItem.options[i]?.id ?? null, text, orderIndex: i }))
        });
      } else {
        await answerTemplatesApi.create({ name: form.name, options: form.options });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    await answerTemplatesApi.delete(id);
    load();
  };

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Cevap Şablonları</h1>
          <p>Sorular için cevap seçenek şablonlarını yönetin</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Şablon</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Seçenek Sayısı</th>
                <th>Seçenekler</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.options.length}</td>
                  <td>
                    <div className="option-pills">
                      {t.options.map(o => <span key={o.id} className="pill">{o.text}</span>)}
                    </div>
                  </td>
                  <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-secondary'}`}>{t.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(t)}>Düzenle</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {templates.length === 0 && <div className="empty-state">Henüz şablon eklenmemiş.</div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Şablonu Düzenle' : 'Yeni Şablon'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Şablon Adı</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: Evet/Hayır" />
              </div>
              <div className="form-group">
                <label>Seçenekler ({form.options.length}/4)</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="option-row">
                    <span className="option-num">{i + 1}.</span>
                    <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Seçenek ${i + 1}`} />
                    {form.options.length > 2 && (
                      <button className="btn btn-sm btn-danger" onClick={() => removeOption(i)}>×</button>
                    )}
                  </div>
                ))}
                {form.options.length < 4 && (
                  <button className="btn btn-sm btn-outline mt-2" onClick={addOption}>+ Seçenek Ekle</button>
                )}
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
