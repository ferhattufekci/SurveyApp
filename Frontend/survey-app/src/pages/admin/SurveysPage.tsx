import SearchInput from '../../components/admin/SearchInput';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { surveysApi, questionsApi, usersApi, answerTemplatesApi, extractErrorMessage } from '../../api';
import type { SurveyListItem, QuestionListItem, User, AnswerTemplate } from '../../types';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';

type FilterKey = 'all' | 'active' | 'passive' | 'expired';
const PAGE_SIZE = 8;
const Req = () => <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>;

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: '#1f2937', color: '#fff', fontSize: '12px', padding: '5px 10px', borderRadius: '6px', zIndex: 999, boxShadow: '0 2px 8px rgba(0,0,0,.25)', pointerEvents: 'none' }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderWidth: '5px', borderStyle: 'solid', borderColor: '#1f2937 transparent transparent transparent' }} />
        </span>
      )}
    </span>
  );
}

export default function SurveysPage() {
  const location = useLocation();
  const { language } = useLanguageStore();
  const [surveys, setSurveys]     = useState<SurveyListItem[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any | null>(null);
  const [editRowNum, setEditRowNum] = useState(0);
  const [form, setForm] = useState({ title: '', description: '', startDate: '', endDate: '', isActive: true, questionIds: [] as number[], userIds: [] as number[] });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState<'duplicate' | 'responded' | 'general' | ''>('');
  const [errorDetail, setErrorDetail] = useState('');
  const [shake, setShake]         = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch]       = useState(() => { const p = new URLSearchParams(location.search); return p.get('search') || ''; });
  const [activeFilter, setActiveFilter] = useState<FilterKey>(() => {
    const p = new URLSearchParams(location.search);
    const f = p.get('filter');
    return (f === 'active' || f === 'passive' || f === 'expired') ? f : 'all';
  });
  const [page, setPage] = useState(1);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = () =>
    Promise.all([surveysApi.getAll(), questionsApi.getAll(), usersApi.getAll(), answerTemplatesApi.getAll()])
      .then(([s, q, u, tpl]) => { setSurveys(s); setQuestions(q); setUsers(u.filter((u: User) => u.role === 'User')); setTemplates(tpl); })
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
    setForm({ title: detail.title, description: detail.description, startDate: detail.startDate.substring(0, 10), endDate: detail.endDate.substring(0, 10), isActive: detail.isActive, questionIds: detail.questions.map((q: any) => q.questionId), userIds: detail.assignedUserIds });
    setError(''); setErrorType(''); setErrorDetail(''); setShowModal(true);
  };

  const toggleQ = (id: number) => setForm(f => ({ ...f, questionIds: f.questionIds.includes(id) ? f.questionIds.filter(q => q !== id) : [...f.questionIds, id] }));
  const toggleU = (id: number) => setForm(f => ({ ...f, userIds: f.userIds.includes(id) ? f.userIds.filter(u => u !== id) : [...f.userIds, id] }));

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.title.trim()) { setError(tx(language, t.surveys.errTitleReq)); setErrorType('general'); return; }
    if (!form.startDate || !form.endDate) { setError(tx(language, t.surveys.errDatesReq)); setErrorType('general'); return; }
    if (form.questionIds.length === 0) { setError(tx(language, t.surveys.errQuestionsReq)); setErrorType('general'); return; }
    setSaving(true);
    try {
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
      if (editItem) await surveysApi.update(editItem.id, payload);
      else await surveysApi.create(payload);
      closeModal();
      showSuccess(editItem ? tx(language, t.surveys.successUpdate) : tx(language, t.surveys.successCreate));
      load();
    } catch (e: any) {
      const msg = extractErrorMessage(e);
      const parts = msg.split('|');
      const isDup = msg.toLowerCase().includes('zaten mevcut') || msg.toLowerCase().includes('already exists');
      const isRes = parts.length === 3 && (msg.toLowerCase().includes('yanıtlanmıştır') || msg.toLowerCase().includes('responses'));
      setError(isRes ? parts[0] : msg); setErrorType(isRes ? 'responded' : isDup ? 'duplicate' : 'general');
      if (isRes) setErrorDetail(parts[2]);
      setShake(true); setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, rowNum: number) => {
    if (!confirm(`${rowNum} ${tx(language, t.surveys.deleteConfirm)}`)) return;
    await surveysApi.delete(id); load();
    showSuccess(`${rowNum} ${tx(language, t.surveys.successDelete)}`);
  };

  // ── Toplam Anket → hepsini göster ───────────────────────────────────────
  const handleTotalClick  = () => { setActiveFilter('all'); setSearch(''); setPage(1); };
  const handleFilterClick = (key: FilterKey) => { setActiveFilter(prev => prev === key ? 'all' : key); setSearch(''); setPage(1); };

  const now = new Date();
  const isExpiredFn = (s: SurveyListItem) => s.isActive && new Date(s.endDate) < now;
  const totalCount   = surveys.length;
  const activeCount  = surveys.filter(s => s.isActive && !isExpiredFn(s)).length;
  const passiveCount = surveys.filter(s => !s.isActive).length;
  const expiredCount = surveys.filter(isExpiredFn).length;

  const questionMap = new Map<number, QuestionListItem>(questions.map(q => [q.id, q]));
  const templateMap = new Map<number, AnswerTemplate>(templates.map(tpl => [tpl.id, tpl]));

  const getSearchText = (s: SurveyListItem) => (s.questionIds || []).map(qId => { const q = questionMap.get(qId); if (!q) return ''; const tpl = templateMap.get(q.answerTemplateId); return `${q.text} ${q.answerTemplateName} ${tpl ? tpl.options.map(o => o.text).join(' ') : ''}`; }).join(' ');

  const filtered = surveys.filter(s => {
    const exp = isExpiredFn(s);
    const ok = activeFilter === 'active' ? s.isActive && !exp : activeFilter === 'passive' ? !s.isActive : activeFilter === 'expired' ? exp : true;
    if (!ok) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const st = !s.isActive ? `pasif passive` : exp ? `süresi geçti expired` : `aktif active`;
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || st.includes(q) ||
      new Date(s.startDate).toLocaleDateString('tr-TR').includes(q) || new Date(s.endDate).toLocaleDateString('tr-TR').includes(q) ||
      String(s.assignedUserCount).includes(q) || String(s.responseCount).includes(q) || getSearchText(s).toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pill = (key: FilterKey, aBg: string, aC: string, iBg: string, iC: string) => ({
    flex: 1, background: activeFilter === key ? aBg : iBg, color: activeFilter === key ? aC : iC,
    borderRadius: '8px', padding: '6px 10px', textAlign: 'center' as const,
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    border: activeFilter === key ? `2px solid ${aC}` : '2px solid transparent',
    transition: 'all 0.15s', userSelect: 'none' as const,
  });

  const totalStyle: React.CSSProperties = {
    fontWeight: 600, cursor: 'pointer',
    color: activeFilter === 'all' ? '#6366f1' : '#4b5563',
    background: activeFilter === 'all' ? '#e0e7ff' : 'transparent',
    borderRadius: '6px', padding: '2px 8px',
    border: activeFilter === 'all' ? '1.5px solid #6366f144' : '1.5px solid transparent',
    transition: 'all 0.15s', userSelect: 'none',
  };

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="page">
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}}.modal-shake{animation:shake 0.6s ease;}`}</style>

      {successMsg && <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 16px rgba(16,185,129,.35)' }}>✅ {successMsg}</div>}

      <div className="page-header">
        <div><h1>{tx(language, t.surveys.title)}</h1><p>{tx(language, t.surveys.subtitle)}</p></div>
        <button className="btn btn-primary" onClick={openCreate}>{tx(language, t.surveys.newSurvey)}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>📝</span>
            <span style={totalStyle} onClick={handleTotalClick}>{tx(language, t.surveys.totalSurveys)}</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={pill('active',  '#15803d','#fff','#dcfce7','#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} {tx(language, t.common.active)}</span>
            <span style={pill('passive', '#6b7280','#fff','#f3f4f6','#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} {tx(language, t.common.passive)}</span>
            <span style={pill('expired', '#b45309','#fff','#fef3c7','#b45309')} onClick={() => handleFilterClick('expired')}>⚠️ {expiredCount} {tx(language, t.surveys.filterExpired)}</span>
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{tx(language, t.surveys.infoTitle)}</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>{tx(language, t.surveys.infoDesc)}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{tx(language, t.surveys.infoSub)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput value={search} placeholder={tx(language, t.surveys.searchPlaceholder)} onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }} />
          {activeFilter !== 'all' && <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>{tx(language, t.common.clearFilter)}</button>}
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>#</th><th>{tx(language, t.common.status)}</th><th>{tx(language, t.surveys.colTitle)}</th><th>{tx(language, t.surveys.colQuestionsTemplates)}</th><th>{tx(language, t.surveys.colStart)}</th><th>{tx(language, t.surveys.colEnd)}</th><th>{tx(language, t.surveys.colAssigned)}</th><th>{tx(language, t.surveys.colResponse)}</th><th>{tx(language, t.common.actions)}</th></tr></thead>
            <tbody>
              {paginated.map((s, i) => {
                const rowNum  = (safePage - 1) * PAGE_SIZE + i + 1;
                const expired = isExpiredFn(s);
                const hasResp = s.responseCount > 0;
                const statusLabel = !s.isActive ? tx(language, t.surveys.statusPassive) : expired ? tx(language, t.surveys.statusExpired) : tx(language, t.surveys.statusActive);
                const statusClass = !s.isActive ? 'badge-secondary' : expired ? 'badge-warning' : 'badge-success';
                const canEdit = !expired && !hasResp;
                const canDel  = !expired && !hasResp;
                const editTip = expired ? tx(language, t.surveys.tooltipExpiredEdit) : hasResp ? `${s.responseCount} ${tx(language, t.surveys.tooltipResponseEdit)}` : '';
                const delTip  = expired ? tx(language, t.surveys.tooltipExpiredDel)  : hasResp ? `${s.responseCount} ${tx(language, t.surveys.tooltipResponseDel)}` : '';
                return (
                  <tr key={s.id}>
                    <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                    <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <strong>{s.title}</strong><br />
                      <small className="text-muted">{s.description.substring(0, 50)}{s.description.length > 50 ? '...' : ''}</small>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      {(s.questionIds || []).length === 0 ? <span className="text-muted" style={{ fontSize: '12px' }}>{tx(language, t.surveys.noQuestion)}</span> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {(s.questionIds || []).map((qId, qi) => {
                            const q = questionMap.get(qId); if (!q) return null;
                            const tpl = templateMap.get(q.answerTemplateId);
                            return (
                              <div key={qId} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '6px 9px' }}>
                                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500, marginBottom: '4px', display: 'flex', gap: '5px' }}>
                                  <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '16px' }}>{qi + 1}.</span>
                                  <span>{q.text.length > 45 ? q.text.substring(0, 45) + '…' : q.text}</span>
                                </div>
                                {tpl && <div style={{ paddingLeft: '21px', display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', background: '#eef2ff', color: '#6366f1', borderRadius: '4px', padding: '1px 6px', fontWeight: 600 }}>{tpl.name}</span>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>→</span>
                                  {tpl.options.map(o => <span key={o.id} style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', padding: '1px 5px', border: '1px solid #e2e8f0' }}>{o.text}</span>)}
                                </div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.startDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.endDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB')}</td>
                    <td><span className="badge badge-info">{s.assignedUserCount} {tx(language, t.surveys.person)}</span></td>
                    <td><span className="badge badge-success">{s.responseCount} {tx(language, t.surveys.answer)}</span></td>
                    <td>
                      <div className="action-btns">
                        <Link to={`/admin/reports/${s.id}`} className="btn btn-sm btn-info">{tx(language, t.surveys.report)}</Link>
                        {canEdit ? <button className="btn btn-sm btn-outline" onClick={() => openEdit(s.id, rowNum)}>{tx(language, t.common.edit)}</button>
                          : <Tooltip text={editTip}><button className="btn btn-sm btn-outline" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>{tx(language, t.common.edit)}</button></Tooltip>}
                        {canDel ? <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, rowNum)}>{tx(language, t.common.delete)}</button>
                          : <Tooltip text={delTip}><button className="btn btn-sm btn-danger" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>{tx(language, t.common.delete)}</button></Tooltip>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">{tx(language, t.common.notFound)}</div>}
        </div>
        {totalPages > 1 && (
          <div className="pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{filtered.length} {language === 'tr' ? 'anketten' : 'surveys'} {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {tx(language, t.common.showing)}</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>{tx(language, t.common.prev)}</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)} style={{ minWidth: '36px' }}>{p}</button>)}
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>{tx(language, t.common.next)}</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal modal-lg${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `#${editRowNum} ${tx(language, t.surveys.modalEdit)}` : tx(language, t.surveys.modalCreate)}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ display: 'flex', gap: '10px', background: errorType === 'duplicate' ? '#fff7ed' : errorType === 'responded' ? '#fefce8' : '#fef2f2', border: `1px solid ${errorType === 'duplicate' ? '#fed7aa' : errorType === 'responded' ? '#fde047' : '#fecaca'}`, borderLeft: `4px solid ${errorType === 'duplicate' ? '#f97316' : errorType === 'responded' ? '#eab308' : '#ef4444'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{errorType === 'duplicate' ? '⚠️' : errorType === 'responded' ? '🔒' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px', color: errorType === 'duplicate' ? '#c2410c' : errorType === 'responded' ? '#854d0e' : '#dc2626' }}>
                      {errorType === 'duplicate' ? tx(language, t.surveys.dupTitle) : errorType === 'responded' ? tx(language, t.surveys.respondedTitle) : tx(language, t.common.error)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                    {errorType === 'responded' && errorDetail && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>}
                    {errorType === 'responded' && <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500, marginTop: '6px' }}>{tx(language, t.surveys.respondedHint)}</div>}
                    {errorType === 'duplicate' && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{tx(language, t.surveys.dupHint)}</div>}
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>{tx(language, t.surveys.titleLabel)}<Req /></label>
                  <input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (errorType === 'duplicate') { setError(''); setErrorType(''); } }} placeholder={tx(language, t.surveys.titlePh)} style={errorType === 'duplicate' ? { borderColor: '#f97316', boxShadow: '0 0 0 3px #fed7aa66' } : {}} />
                </div>
                <div className="form-group">
                  <label>{tx(language, t.common.status)}</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                    <option value="true">{tx(language, t.common.active)}</option>
                    <option value="false">{tx(language, t.common.passive)}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{tx(language, t.surveys.descLabel)}</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={tx(language, t.surveys.descPh)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{tx(language, t.surveys.startDate)}<Req /></label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{tx(language, t.surveys.endDate)}<Req /></label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>{tx(language, t.surveys.questionsLabel)} ({form.questionIds.length} {tx(language, t.surveys.selected)})<Req /> <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>{tx(language, t.surveys.questionsNote)}</span></label>
                <div className="checkbox-list">
                  {questions.filter(q => q.isActive).map(q => (
                    <label key={q.id} className="checkbox-item">
                      <input type="checkbox" checked={form.questionIds.includes(q.id)} onChange={() => toggleQ(q.id)} />
                      <span>{q.text}</span>
                      <span className="pill ml-auto">{q.answerTemplateName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>{tx(language, t.surveys.usersLabel)} ({form.userIds.length} {tx(language, t.surveys.selected)}) <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>{tx(language, t.surveys.usersNote)}</span></label>
                <div className="checkbox-list">
                  {users.filter(u => u.isActive).map(u => (
                    <label key={u.id} className="checkbox-item">
                      <input type="checkbox" checked={form.userIds.includes(u.id)} onChange={() => toggleU(u.id)} />
                      <span>{u.fullName}</span>
                      <span className="text-muted ml-auto">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>{tx(language, t.common.cancel)}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? tx(language, t.common.saving) : tx(language, t.common.save)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
