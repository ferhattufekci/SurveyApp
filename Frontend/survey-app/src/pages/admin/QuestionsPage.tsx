import SearchInput from '../../components/admin/SearchInput';
import { useEffect, useState, useRef } from 'react';
import { questionsApi, answerTemplatesApi, surveysApi } from '../../api';
import type { QuestionListItem, AnswerTemplate, SurveyListItem } from '../../types';
import { Link, useLocation } from 'react-router-dom';

type FilterKey = 'all' | 'active' | 'passive';
const PAGE_SIZE = 8;

export default function QuestionsPage() {
  const location = useLocation();
  const [questions, setQuestions]   = useState<QuestionListItem[]>([]);
  const [templates, setTemplates]   = useState<AnswerTemplate[]>([]);
  const [surveys, setSurveys]       = useState<SurveyListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<QuestionListItem | null>(null);
  const [form, setForm]             = useState({ text: '', answerTemplateId: 0, isActive: true });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [errorType, setErrorType]   = useState<'duplicate' | 'passive_conflict' | 'general' | ''>('');
  const [errorDetail, setErrorDetail] = useState('');
  const [shake, setShake]           = useState(false);
  const [search, setSearch]         = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || '';
  });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage]             = useState(1);
  const [deleteError, setDeleteError] = useState<{ id: number; count: number; detail: string } | null>(null);
  const [editRowNum, setEditRowNum]   = useState(0);
  const [successMsg, setSuccessMsg]   = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = () =>
    Promise.all([questionsApi.getAll(), answerTemplatesApi.getAll(), surveysApi.getAll()])
      .then(([q, t, s]) => { setQuestions(q); setTemplates(t); setSurveys(s); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const closeModal = () => { setShowModal(false); setError(''); setErrorType(''); setErrorDetail(''); };

  const openCreate = () => {
    setEditItem(null);
    setForm({ text: '', answerTemplateId: templates[0]?.id || 0, isActive: true });
    setError(''); setErrorType(''); setShowModal(true);
  };

  const openEdit = (q: QuestionListItem, rowNum: number) => {
    setEditItem(q); setEditRowNum(rowNum);
    setForm({ text: q.text, answerTemplateId: q.answerTemplateId, isActive: q.isActive });
    setError(''); setErrorType(''); setShowModal(true);
  };

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.text.trim()) { setError('Soru metni zorunludur.'); setErrorType('general'); return; }
    if (!form.answerTemplateId) { setError('Cevap şablonu seçiniz.'); setErrorType('general'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await questionsApi.update(editItem.id, { text: form.text, answerTemplateId: form.answerTemplateId, isActive: form.isActive });
      } else {
        await questionsApi.create({ text: form.text, answerTemplateId: form.answerTemplateId, isActive: form.isActive });
      }
      closeModal();
      showSuccess(editItem ? 'Soru başarıyla güncellendi.' : 'Soru başarıyla oluşturuldu.');
      load();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Bir hata oluştu.';
      const parts = msg.split('|');
      const isDuplicate = msg.toLowerCase().includes('zaten bir soru mevcut');
      const isPassiveConflict = parts.length === 3 && msg.toLowerCase().includes('aktif ankette');
      setError(isPassiveConflict ? parts[0] : msg);
      setErrorType(isPassiveConflict ? 'passive_conflict' : isDuplicate ? 'duplicate' : 'general');
      if (isPassiveConflict) setErrorDetail(parts[2]);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, rowNum: number) => {
    setDeleteError(null);
    if (!confirm(`${rowNum} numaralı soruyu silmek istediğinize emin misiniz?`)) return;
    try {
      await questionsApi.delete(id); load(); showSuccess(`${rowNum} numaralı soru başarıyla silindi.`);
    } catch (e: any) {
      const msg: string = e.response?.data?.message || '';
      const parts = msg.split('|');
      if (parts.length === 3) {
        setDeleteError({ id, count: parseInt(parts[1]), detail: parts[2] });
      } else {
        setDeleteError({ id, count: 0, detail: msg });
      }
      setTimeout(() => setDeleteError(null), 8000);
    }
  };

  const handleFilterClick = (key: FilterKey) => {
    setActiveFilter(prev => prev === key ? 'all' : key);
    setSearch(''); setPage(1);
  };

  // İstatistikler
  const totalCount   = questions.length;
  const activeCount  = questions.filter(q => q.isActive).length;
  const passiveCount = questions.filter(q => !q.isActive).length;

  // Filtreleme
  // Template id -> options map for search
  const templateMap = new Map<number, AnswerTemplate>(templates.map(t => [t.id, t]));

  const filtered = questions.filter(q => {
    const passesFilter =
      activeFilter === 'active'  ? q.isActive :
      activeFilter === 'passive' ? !q.isActive : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const durum = q.isActive ? 'aktif' : 'pasif';
    const tpl = templateMap.get(q.answerTemplateId);
    const optionsText = tpl ? tpl.options.map((o: { text: string }) => o.text).join(' ') : '';
    const optionCount = tpl ? `${tpl.options.length} seçenek` : '';
    return (
      q.text.toLowerCase().includes(s) ||
      q.answerTemplateName.toLowerCase().includes(s) ||
      durum.includes(s) ||
      optionsText.toLowerCase().includes(s) ||
      optionCount.includes(s)
    );
  });

  // Pagination
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

  function DeletePopover({ question, usedSurveys }: { question: QuestionListItem; usedSurveys: SurveyListItem[] }) {
    const [show, setShow]   = useState(false);
    const [pos, setPos]     = useState({ top: 0, left: 0 });
    const btnRef            = useRef<HTMLSpanElement>(null);
    const hideTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleHide = () => {
      hideTimer.current = setTimeout(() => setShow(false), 120);
    };
    const cancelHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };

    const handleEnter = () => {
      cancelHide();
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.top + window.scrollY, left: r.right + window.scrollX });
      }
      setShow(true);
    };

    return (
      <>
        <span ref={btnRef} style={{ display: 'inline-block' }}
          onMouseEnter={handleEnter}
          onMouseLeave={scheduleHide}>
          <button
            style={{ opacity: 0.45, pointerEvents: 'none', cursor: 'not-allowed' }}
            className="btn btn-sm btn-danger"
          >Sil</button>
        </span>

        {show && (
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            style={{
              position: 'fixed',
              top: pos.top - 10,
              left: pos.left - 310,
              width: '300px',
              background: '#fff',
              borderRadius: '10px',
              zIndex: 9999,
              boxShadow: '0 8px 32px rgba(0,0,0,.2)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              transform: 'translateY(-100%)',
            }}>
            <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#c2410c' }}>Soru Silinemez</div>
                <div style={{ fontSize: '12px', color: '#9a3412' }}>
                  <strong>{usedSurveys.length} ankette</strong> kullanılıyor
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '8px 0' }}>
              {usedSurveys.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderBottom: i < usedSurveys.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', minWidth: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#374151', lineHeight: 1.3 }}>
                    {s.title.length > 40 ? s.title.substring(0, 40) + '…' : s.title}
                  </span>
                  <span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {s.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
                💡 Silmek için bu soruyu kullanan anketleri güncelleyin.
              </div>
              <Link
                to={`/admin/surveys?search=${encodeURIComponent(question.text.substring(0, 30))}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}
                onClick={() => setShow(false)}
              >
                🔗 Anketleri görüntüle →
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page">
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}}.modal-shake{animation:shake 0.6s ease;}`}</style>

      {successMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          background: '#10b981', color: '#fff', padding: '12px 20px',
          borderRadius: '10px', fontWeight: 600, fontSize: '14px',
          boxShadow: '0 4px 16px rgba(16,185,129,.35)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>✅ {successMsg}</div>
      )}

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

        {/* Bilgilendirme */}
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Her soru</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>Bir cevap şablonuyla ilişkilendirilir</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Aktif sorular anketlere eklenebilir</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput
            value={search}
            placeholder="Soru metni, şablon adı, seçenek veya durum ara..."
            onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }}
          />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>Filtreyi Temizle ×</button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Durum</th><th>Soru Metni</th><th>Cevap Şablonu</th><th>Seçenekler</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {paginated.map((q, i) => {
                const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                return (
                <>
                  <tr key={q.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                    <td><span className={`badge ${q.isActive ? 'badge-success' : 'badge-secondary'}`}>{q.isActive ? 'Aktif' : 'Pasif'}</span></td>
                    <td>{q.text}</td>
                    <td><span className="pill">{q.answerTemplateName}</span></td>
                    <td>
                      {(() => {
                        const tpl = templateMap.get(q.answerTemplateId);
                        if (!tpl) return <span className="text-muted">—</span>;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{tpl.options.length} seçenek</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {tpl.options.map((o: { id: number; text: string }) => (
                                <span key={o.id} className="pill" style={{ fontSize: '11px', padding: '2px 7px' }}>{o.text}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(q, rowNum)}>Düzenle</button>
                        {q.usedInSurveysCount > 0 ? (
                          <DeletePopover
                            question={q}
                            usedSurveys={surveys.filter(s => s.questionIds?.includes(q.id))}
                          />
                        ) : (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id, rowNum)}>Sil</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {deleteError?.id === q.id && (
                    <tr key={`err-${q.id}`}>
                      <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          background: '#fff7ed', borderLeft: '4px solid #f97316',
                          borderBottom: '1px solid #fed7aa', padding: '12px 16px',
                          animation: 'slideDown 0.2s ease',
                        }}>
                          <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '1px' }}>🔒</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#c2410c', fontSize: '13px', marginBottom: '3px' }}>
                              Soru Silinemez — Ankette Kullanımda
                            </div>
                            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                              Bu soru <strong>{deleteError.count} ankette</strong> kullanılmaktadır.
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{deleteError.detail}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                              💡 Silmek için önce bu soruyu kullanan anketleri güncelleyin.
                            </div>
                          </div>
                          <button onClick={() => setDeleteError(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}
                            title="Kapat">×</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Soru bulunamadı.</div>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} sorudan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
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

      {/* Modal */}
      {showModal && (
        <>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="modal-overlay" onClick={closeModal}>
            <div className={`modal${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editItem ? `#${editRowNum} Soruyu Düzenle` : 'Yeni Soru'}</h3>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body">
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: errorType === 'duplicate' ? '#fff7ed' : errorType === 'passive_conflict' ? '#fefce8' : '#fef2f2',
                    border: `1px solid ${errorType === 'duplicate' ? '#fed7aa' : errorType === 'passive_conflict' ? '#fde047' : '#fecaca'}`,
                    borderLeft: `4px solid ${errorType === 'duplicate' ? '#f97316' : errorType === 'passive_conflict' ? '#eab308' : '#ef4444'}`,
                    borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>
                      {errorType === 'duplicate' ? '⚠️' : errorType === 'passive_conflict' ? '🔒' : '❌'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px',
                        color: errorType === 'duplicate' ? '#c2410c' : errorType === 'passive_conflict' ? '#854d0e' : '#dc2626' }}>
                        {errorType === 'duplicate'
                          ? 'Yinelenen Soru Metni'
                          : errorType === 'passive_conflict'
                            ? 'Pasife Alınamaz — Aktif Anketlerde Kullanımda'
                            : 'Hata'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                      {errorType === 'passive_conflict' && errorDetail && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>
                      )}
                      {errorType === 'passive_conflict' && (
                        <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500, marginTop: '6px' }}>
                          💡 Bu anketleri önce pasife alın, ardından soruyu pasife alabilirsiniz.
                        </div>
                      )}
                      {errorType === 'duplicate' && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Soru metnini değiştirerek tekrar deneyebilirsiniz.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Soru Metni</label>
                  <textarea
                    rows={3}
                    value={form.text}
                    onChange={e => {
                      setForm(f => ({ ...f, text: e.target.value }));
                      if (errorType === 'duplicate') { setError(''); setErrorType(''); }
                    }}
                    placeholder="Soru metnini giriniz..."
                    style={errorType === 'duplicate' ? { borderColor: '#f97316', boxShadow: '0 0 0 3px #fed7aa66' } : {}}
                  />
                </div>

                <div className="form-group">
                  <label>Cevap Şablonu</label>
                  <select value={form.answerTemplateId} onChange={e => setForm(f => ({ ...f, answerTemplateId: Number(e.target.value) }))}>
                    <option value={0}>Şablon seçiniz...</option>
                    {templates.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name} ({t.options.length} seçenek)</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Durum</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={closeModal}>İptal</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
