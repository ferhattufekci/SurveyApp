import { useEffect, useState } from 'react';
import { questionsApi, answerTemplatesApi } from '../../api';
import type { QuestionListItem, AnswerTemplate } from '../../types';

type FilterKey = 'all' | 'active' | 'passive';

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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const load = () =>
    Promise.all([questionsApi.getAll(), answerTemplatesApi.getAll()])
      .then(([q, t]) => { setQuestions(q); setTemplates(t); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null); setForm({ text: '', answerTemplateId: templates[0]?.id || 0, isActive: true });
    setError(''); setShowModal(true);
  };
  const openEdit = (q: QuestionListItem) => {
    setEditItem(q); setForm({ text: q.text, answerTemplateId: q.answerTemplateId, isActive: q.isActive });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) { setError('Soru metni zorunludur.'); return; }
    if (!form.answerTemplateId) { setError('Cevap şablonu seçiniz.'); return; }
    setSaving(true);
    try {
      if (editItem) await questionsApi.update(editItem.id, form);
      else await questionsApi.create({ text: form.text, answerTemplateId: form.answerTemplateId });
      setShowModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    await questionsApi.delete(id); load();
  };

  const handleFilterClick = (key: FilterKey) => { setActiveFilter(prev => prev === key ? 'all' : key); setSearch(''); };

  const totalCount   = questions.length;
  const activeCount  = questions.filter(q => q.isActive).length;
  const passiveCount = questions.filter(q => !q.isActive).length;

  // Her şablonun kaç soruda kullanıldığını bul
  const templateUsage = templates.map(t => ({
    name: t.name,
    count: questions.filter(q => q.answerTemplateId === t.id).length
  })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const filtered = questions.filter(q => {
    const passesFilter =
      activeFilter === 'active'  ? q.isActive :
      activeFilter === 'passive' ? !q.isActive : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const durum = q.isActive ? 'aktif' : 'pasif';
    return q.text.toLowerCase().includes(s) || q.answerTemplateName.toLowerCase().includes(s) || durum.includes(s);
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
        <div><h1>Sorular</h1><p>Anketlerde kullanılacak soruları yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Soru</button>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {/* Toplam */}
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>❓</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Toplam Soru</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} Aktif</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} Pasif</span>
          </div>
        </div>

        {/* Şablon dağılımı */}
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b22', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Şablona Göre Dağılım</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
            {templateUsage.length > 0 ? templateUsage.map(t => (
              <span key={t.name} style={{ background: '#fef3c7', color: '#92400e', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                {t.name}: {t.count}
              </span>
            )) : <span style={{ color: '#9ca3af', fontSize: '13px' }}>Henüz soru yok</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Soru metni, şablon adı veya durum ara..." value={search}
            onChange={e => { setSearch(e.target.value); setActiveFilter('all'); }} />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => setActiveFilter('all')}>Filtreyi Temizle ×</button>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Durum</th><th>#</th><th>Soru Metni</th><th>Cevap Şablonu</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => (
                <tr key={q.id}>
                  <td><span className={`badge ${q.isActive ? 'badge-success' : 'badge-secondary'}`}>{q.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td className="text-muted">{i + 1}</td>
                  <td>{q.text}</td>
                  <td><span className="pill">{q.answerTemplateName}</span></td>
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
                <textarea rows={3} value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Soru metnini giriniz..." />
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
                  <label>Durum</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              )}
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
