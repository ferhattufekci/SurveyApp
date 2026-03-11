import SearchInput from '../../components/admin/SearchInput';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { surveysApi, questionsApi, usersApi } from '../../api';
import type { SurveyListItem, QuestionListItem, User } from '../../types';

type FilterKey = 'all' | 'active' | 'passive' | 'expired';
const PAGE_SIZE = 8;

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', whiteSpace: 'nowrap',
          background: '#1f2937', color: '#fff', fontSize: '12px',
          padding: '5px 10px', borderRadius: '6px', zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,.25)', pointerEvents: 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: '#1f2937 transparent transparent transparent',
          }} />
        </span>
      )}
    </span>
  );
}

export default function SurveysPage() {
  const [surveys, setSurveys]     = useState<SurveyListItem[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any | null>(null);
  const [editRowNum, setEditRowNum] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', startDate: '', endDate: '',
    isActive: true, questionIds: [] as number[], userIds: [] as number[],
  });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState<'duplicate' | 'responded' | 'general' | ''>('');
  const [errorDetail, setErrorDetail] = useState('');
  const [shake, setShake]         = useState(false);
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage]           = useState(1);

  const load = () =>
    Promise.all([surveysApi.getAll(), questionsApi.getAll(), usersApi.getAll()])
      .then(([s, q, u]) => { setSurveys(s); setQuestions(q); setUsers(u.filter((u: User) => u.role === 'User')); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const closeModal = () => { setShowModal(false); setError(''); setErrorType(''); setErrorDetail(''); };

  const openCreate = () => {
    setEditItem(null); setEditRowNum(0);
    setForm({ title: '', description: '', startDate: '', endDate: '', isActive: true, questionIds: [], userIds: [] });
    setError(''); setErrorType(''); setErrorDetail(''); setShowModal(true);
  };

  const openEdit = async (id: number, rowNum: number) => {
    const detail = await surveysApi.getById(id);
    setEditItem(detail); setEditRowNum(rowNum);
    setForm({
      title: detail.title, description: detail.description,
      startDate: detail.startDate.substring(0, 10), endDate: detail.endDate.substring(0, 10),
      isActive: detail.isActive,
      questionIds: detail.questions.map((q: any) => q.questionId),
      userIds: detail.assignedUserIds,
    });
    setError(''); setErrorType(''); setErrorDetail(''); setShowModal(true);
  };

  const toggleQuestion = (id: number) =>
    setForm(f => ({ ...f, questionIds: f.questionIds.includes(id) ? f.questionIds.filter(q => q !== id) : [...f.questionIds, id] }));
  const toggleUser = (id: number) =>
    setForm(f => ({ ...f, userIds: f.userIds.includes(id) ? f.userIds.filter(u => u !== id) : [...f.userIds, id] }));

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.title.trim()) { setError('Anket başlığı zorunludur.'); setErrorType('general'); return; }
    if (!form.startDate || !form.endDate) { setError('Tarihler zorunludur.'); setErrorType('general'); return; }
    if (form.questionIds.length === 0) { setError('En az bir soru seçiniz.'); setErrorType('general'); return; }
    setSaving(true);
    try {
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
      if (editItem) await surveysApi.update(editItem.id, payload);
      else await surveysApi.create(payload);
      closeModal(); load();
    } catch (e: any) {
      const msg: string = e.response?.data?.message || 'Bir hata oluştu.';
      const parts = msg.split('|');
      const isDuplicate = msg.toLowerCase().includes('zaten mevcut');
      const isResponded = parts.length === 3 && msg.toLowerCase().includes('yanıtlanmıştır');
      setError(isResponded ? parts[0] : msg);
      setErrorType(isResponded ? 'responded' : isDuplicate ? 'duplicate' : 'general');
      if (isResponded) setErrorDetail(parts[2]);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, rowNum: number) => {
    if (!confirm(`${rowNum} numaralı anketi silmek istediğinize emin misiniz?`)) return;
    await surveysApi.delete(id); load();
  };

  const handleFilterClick = (key: FilterKey) => { setActiveFilter(prev => prev === key ? 'all' : key); setSearch(''); setPage(1); };

  const now = new Date();
  const isExpiredFn = (s: SurveyListItem) => s.isActive && new Date(s.endDate) < now;
  const totalCount   = surveys.length;
  const activeCount  = surveys.filter(s => s.isActive && !isExpiredFn(s)).length;
  const passiveCount = surveys.filter(s => !s.isActive).length;
  const expiredCount = surveys.filter(isExpiredFn).length;

  const filtered = surveys.filter(s => {
    const expired = isExpiredFn(s);
    const passesFilter =
      activeFilter === 'active'  ? s.isActive && !expired :
      activeFilter === 'passive' ? !s.isActive :
      activeFilter === 'expired' ? expired : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const durum = !s.isActive ? 'pasif' : expired ? 'süresi geçmiş süresi geçti' : 'aktif';
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      durum.includes(q) ||
      new Date(s.startDate).toLocaleDateString('tr-TR').includes(q) ||
      new Date(s.endDate).toLocaleDateString('tr-TR').includes(q) ||
      `${s.assignedUserCount} kişi`.includes(q) ||
      String(s.assignedUserCount).includes(q) ||
      `${s.responseCount} yanıt`.includes(q) ||
      String(s.responseCount).includes(q)
    );
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
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)}
          30%{transform:translateX(8px)} 45%{transform:translateX(-6px)}
          60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 90%{transform:translateX(3px)}
        }
        .modal-shake { animation: shake 0.6s ease; }
      `}</style>

      <div className="page-header">
        <div><h1>Anketler</h1><p>Anketleri oluşturun ve yönetin</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Anket</button>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>Toplam Anket</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} Aktif</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} Pasif</span>
            <span style={pillStyle('expired', '#b45309', '#fff', '#fef3c7', '#b45309')} onClick={() => handleFilterClick('expired')}>⚠️ {expiredCount} Süresi Geçmiş</span>
          </div>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Her anket</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>Bir veya daha fazla soru içerir</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Yanıt alınan ve süresi geçmiş anketler düzenlenemez ve silinemez</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput
            value={search}
            placeholder="Başlık, açıklama, tarih (gg.aa.yyyy), atanan/yanıtlayan sayısı veya durum ara..."
            onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }}
          />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>Filtreyi Temizle ×</button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Durum</th><th>Başlık</th><th>Başlangıç</th><th>Bitiş</th><th>Atanan</th><th>Yanıtlayan</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => {
                const rowNum  = (safePage - 1) * PAGE_SIZE + i + 1;
                const expired = isExpiredFn(s);
                const hasResp = s.responseCount > 0;
                const statusLabel = !s.isActive ? 'Pasif' : expired ? 'Süresi Geçti' : 'Aktif';
                const statusClass = !s.isActive ? 'badge-secondary' : expired ? 'badge-warning' : 'badge-success';
                const canDelete   = !expired && !hasResp;
                const canEdit     = !expired && !hasResp;
                const delTip = expired
                  ? 'Süresi geçmiş anketler silinemez'
                  : hasResp ? `${s.responseCount} yanıt alındığı için silinemez` : '';
                const editTip = expired
                  ? 'Süresi geçmiş anketler düzenlenemez'
                  : hasResp ? `${s.responseCount} kullanıcı yanıtladığı için düzenlenemez` : '';

                return (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                    <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <strong>{s.title}</strong><br />
                      <small className="text-muted">{s.description.substring(0, 50)}{s.description.length > 50 ? '...' : ''}</small>
                    </td>
                    <td>{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                    <td>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                    <td><span className="badge badge-info">{s.assignedUserCount} kişi</span></td>
                    <td><span className="badge badge-success">{s.responseCount} yanıt</span></td>
                    <td>
                      <div className="action-btns">
                        <Link to={`/admin/reports/${s.id}`} className="btn btn-sm btn-info">Rapor</Link>

                        {canEdit ? (
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(s.id, rowNum)}>Düzenle</button>
                        ) : (
                          <Tooltip text={editTip}>
                            <button className="btn btn-sm btn-outline" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>Düzenle</button>
                          </Tooltip>
                        )}

                        {canDelete ? (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, rowNum)}>Sil</button>
                        ) : (
                          <Tooltip text={delTip}>
                            <button className="btn btn-sm btn-danger" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>Sil</button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">Anket bulunamadı.</div>}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} anketten {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal modal-lg${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `#${editRowNum} Anketi Düzenle` : 'Yeni Anket'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: errorType === 'duplicate' ? '#fff7ed' : errorType === 'responded' ? '#fefce8' : '#fef2f2',
                  border: `1px solid ${errorType === 'duplicate' ? '#fed7aa' : errorType === 'responded' ? '#fde047' : '#fecaca'}`,
                  borderLeft: `4px solid ${errorType === 'duplicate' ? '#f97316' : errorType === 'responded' ? '#eab308' : '#ef4444'}`,
                  borderRadius: '8px', padding: '12px 14px', marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>
                    {errorType === 'duplicate' ? '⚠️' : errorType === 'responded' ? '🔒' : '❌'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px',
                      color: errorType === 'duplicate' ? '#c2410c' : errorType === 'responded' ? '#854d0e' : '#dc2626' }}>
                      {errorType === 'duplicate' ? 'Yinelenen Anket Başlığı'
                        : errorType === 'responded' ? 'Düzenlenemez — Yanıt Alınmış'
                        : 'Hata'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                    {errorType === 'responded' && errorDetail && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>
                    )}
                    {errorType === 'responded' && (
                      <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500, marginTop: '6px' }}>
                        💡 Yanıt alınan anketlerin içeriği değiştirilemez. Rapor sayfasından sonuçları inceleyebilirsiniz.
                      </div>
                    )}
                    {errorType === 'duplicate' && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        Anket başlığını değiştirerek tekrar deneyebilirsiniz.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Başlık</label>
                  <input value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (errorType === 'duplicate') { setError(''); setErrorType(''); } }}
                    placeholder="Anket başlığı"
                    style={errorType === 'duplicate' ? { borderColor: '#f97316', boxShadow: '0 0 0 3px #fed7aa66' } : {}} />
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
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Anket açıklaması" />
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
              <button className="btn btn-outline" onClick={closeModal}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
