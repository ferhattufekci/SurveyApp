import { useEffect, useState } from 'react';
import { answerTemplatesApi } from '../../api';
import type { AnswerTemplate } from '../../types';

type FilterKey = 'all' | 'active' | 'passive';

const PAGE_SIZE = 8;

export default function AnswerTemplatesPage() {
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<AnswerTemplate | null>(null);
  const [form, setForm] = useState({ name: '', options: ['', ''], isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);

  const load = () => answerTemplatesApi.getAll().then(setTemplates).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', options: ['', ''], isActive: true });
    setError(''); setShowModal(true);
  };
  const openEdit = (t: AnswerTemplate) => {
    setEditItem(t);
    setForm({ name: t.name, options: t.options.map(o => o.text), isActive: t.isActive });
    setError(''); setShowModal(true);
  };
  const addOption = () => { if (form.options.length < 4) setForm(f => ({ ...f, options: [...f.options, ''] })); };
  const removeOption = (i: number) => { if (form.options.length > 2) setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) })); };
  const updateOption = (i: number, val: string) => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? val : o) }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Şablon adı zorunludur.'); return; }
    if (form.options.some(o => !o.trim())) { setError('Tüm seçenekler doldurulmalıdır.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await answerTemplatesApi.update(editItem.id, {
          name: form.name,
          isActive: form.isActive,
          options: form.options.map((text, i) => ({ id: editItem.options[i]?.id ?? null, text, orderIndex: i }))
        });
      } else {
        await answerTemplatesApi.create({ name: form.name, options: form.options, isActive: form.isActive });
      }
      setShowModal(false); load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Bir hata oluştu.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    await answerTemplatesApi.delete(id); load();
  };

  const handleFilterClick = (key: FilterKey) => {
    setActiveFilter(prev => prev === key ? 'all' : key);
    setSearch(''); setPage(1);
  };

  const totalCount   = templates.length;
  const activeCount  = templates.filter(t => t.isActive).length;
  const passiveCount = templates.filter(t => !t.isActive).length;

  const filtered = templates.filter(t => {
    const passesFilter =
      activeFilter === 'active'  ? t.isActive :
      activeFilter === 'passive' ? !t.isActive : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const durum = t.isActive ? 'aktif' : 'pasif';
    return t.name.toLowerCase().includes(q) || durum.includes(q) ||
      t.options.some(o => o.text.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
        <div><h1>Cevap Şablonları</h1><p>Sorular için cevap seçenek şablonlarını yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Şablon</button>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Toplam Şablon</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} Aktif</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} Pasif</span>
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Her şablon</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>2 ila 4 seçenek içerebilir</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Aktif şablonlar sorularda kullanılabilir</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <input className="search-input" placeholder="Şablon adı, seçenek veya durum ara..." value={search}
            onChange={e => { setSearch(e.target.value); setActiveFilter('all'); setPage(1); }} />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>Filtreyi Temizle ×</button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Durum</th><th>Ad</th><th>Seçenek Sayısı</th><th>Seçenekler</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.id}>
                  <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-secondary'}`}>{t.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.options.length}</td>
                  <td><div className="option-pills">{t.options.map(o => <span key={o.id} className="pill">{o.text}</span>)}</div></td>
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
          {filtered.length === 0 && <div className="empty-state">Şablon bulunamadı.</div>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} şablondan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >‹ Önceki</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPage(p)}
                  style={{ minWidth: '36px' }}
                >{p}</button>
              ))}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >Sonraki ›</button>
            </div>
          </div>
        )}
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
                <label>Durum</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>
              <div className="form-group">
                <label>Seçenekler ({form.options.length}/4)</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="option-row">
                    <span className="option-num">{i + 1}.</span>
                    <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Seçenek ${i + 1}`} />
                    {form.options.length > 2 && <button className="btn btn-sm btn-danger" onClick={() => removeOption(i)}>×</button>}
                  </div>
                ))}
                {form.options.length < 4 && <button className="btn btn-sm btn-outline mt-2" onClick={addOption}>+ Seçenek Ekle</button>}
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
