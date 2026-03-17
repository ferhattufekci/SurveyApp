import { useEffect, useState, useRef } from 'react';
import { answerTemplatesApi, questionsApi, extractErrorMessage } from '../../api';
import type { AnswerTemplate, QuestionListItem } from '../../types';
import SearchInput from '../../components/admin/SearchInput';
import { Link } from 'react-router-dom';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';

type FilterKey = 'all' | 'active' | 'passive';
const PAGE_SIZE = 8;

export default function AnswerTemplatesPage() {
  const { language } = useLanguageStore();
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<AnswerTemplate | null>(null);
  const [form, setForm] = useState({ name: '', options: ['', ''], isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'duplicate' | 'passive_conflict' | 'general' | ''>('');
  const [errorDetail, setErrorDetail] = useState('');
  const [shake, setShake] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [deleteError, setDeleteError] = useState<{ id: number; count: number; detail: string } | null>(null);
  const [editRowNum, setEditRowNum] = useState(0);
  const [page, setPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = () =>
    Promise.all([answerTemplatesApi.getAll(), questionsApi.getAll()])
      .then(([tpl, q]) => { setTemplates(tpl); setQuestions(q); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', options: ['', ''], isActive: true });
    setError(''); setShowModal(true);
  };
  const openEdit = (tpl: AnswerTemplate, rowNum: number) => {
    setEditItem(tpl); setEditRowNum(rowNum);
    setForm({ name: tpl.name, options: tpl.options.map(o => o.text), isActive: tpl.isActive });
    setError(''); setShowModal(true);
  };
  const addOption = () => { if (form.options.length < 4) setForm(f => ({ ...f, options: [...f.options, ''] })); };
  const removeOption = (i: number) => { if (form.options.length > 2) setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) })); };
  const updateOption = (i: number, val: string) => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? val : o) }));

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.name.trim()) { setError(tx(language, t.answerTemplates.errNameRequired)); setErrorType('general'); return; }
    if (form.options.some(o => !o.trim())) { setError(tx(language, t.answerTemplates.errOptionsFill)); setErrorType('general'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await answerTemplatesApi.update(editItem.id, {
          name: form.name, isActive: form.isActive,
          options: form.options.map((text, i) => ({ id: editItem.options[i]?.id ?? null, text, orderIndex: i }))
        });
      } else {
        await answerTemplatesApi.create({ name: form.name, options: form.options, isActive: form.isActive });
      }
      setShowModal(false);
      showSuccess(editItem ? tx(language, t.answerTemplates.successUpdate) : tx(language, t.answerTemplates.successCreate));
      load();
    } catch (e: any) {
      const msg = extractErrorMessage(e);
      const parts = msg.split('|');
      const isDuplicate = msg.toLowerCase().includes('zaten mevcut') || msg.toLowerCase().includes('already exists');
      const isPassiveConflict = parts.length === 3 && (msg.toLowerCase().includes('aktif soruda') || msg.toLowerCase().includes('active question'));
      setError(isPassiveConflict ? parts[0] : msg);
      setErrorType(isPassiveConflict ? 'passive_conflict' : isDuplicate ? 'duplicate' : 'general');
      if (isPassiveConflict) setErrorDetail(parts[2]);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, rowNum: number) => {
    setDeleteError(null);
    if (!confirm(`${rowNum} ${tx(language, t.answerTemplates.deleteConfirm)}`)) return;
    try {
      await answerTemplatesApi.delete(id);
      load();
      showSuccess(`${rowNum} ${tx(language, t.answerTemplates.successDelete)}`);
    } catch (e: any) {
      const msg: string = e.response?.data?.message || '';
      const parts = msg.split('|');
      if (parts.length === 3) setDeleteError({ id, count: parseInt(parts[1]), detail: parts[2] });
      else setDeleteError({ id, count: 0, detail: msg });
      setTimeout(() => setDeleteError(null), 8000);
    }
  };

  const handleFilterClick = (key: FilterKey) => {
    setActiveFilter(prev => prev === key ? 'all' : key);
    setSearch(''); setPage(1);
  };

  const totalCount   = templates.length;
  const activeCount  = templates.filter(tpl => tpl.isActive).length;
  const passiveCount = templates.filter(tpl => !tpl.isActive).length;

  const filtered = templates.filter(tpl => {
    const passesFilter =
      activeFilter === 'active'  ? tpl.isActive :
      activeFilter === 'passive' ? !tpl.isActive : true;
    if (!passesFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const durum = tpl.isActive
      ? `${tx(language, t.common.active).toLowerCase()} active`
      : `${tx(language, t.common.passive).toLowerCase()} passive`;
    return tpl.name.toLowerCase().includes(q) || durum.includes(q) ||
      tpl.options.some(o => o.text.toLowerCase().includes(q));
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

  function DeletePopover({ template, usedQuestions }: { template: AnswerTemplate; usedQuestions: QuestionListItem[] }) {
    const [show, setShow] = useState(false);
    const [pos, setPos]   = useState({ top: 0, left: 0 });
    const btnRef  = useRef<HTMLSpanElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleHide = () => { hideTimer.current = setTimeout(() => setShow(false), 120); };
    const cancelHide  = () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
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
        <span ref={btnRef} style={{ display: 'inline-block' }} onMouseEnter={handleEnter} onMouseLeave={scheduleHide}>
          <button style={{ opacity: 0.45, pointerEvents: 'none', cursor: 'not-allowed' }} className="btn btn-sm btn-danger">{tx(language, t.common.delete)}</button>
        </span>
        {show && (
          <div onMouseEnter={cancelHide} onMouseLeave={scheduleHide} style={{
            position: 'fixed', top: pos.top - 10, left: pos.left - 310, width: '300px',
            background: '#fff', borderRadius: '10px', zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,.2)', border: '1px solid #e5e7eb',
            overflow: 'hidden', transform: 'translateY(-100%)',
          }}>
            <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#c2410c' }}>{tx(language, t.answerTemplates.cannotDelete)}</div>
                <div style={{ fontSize: '12px', color: '#9a3412' }}><strong>{usedQuestions.length}</strong> {tx(language, t.answerTemplates.usedIn)}</div>
              </div>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '8px 0' }}>
              {usedQuestions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderBottom: i < usedQuestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', minWidth: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#374151', lineHeight: 1.3 }}>
                    {q.text.length > 48 ? q.text.substring(0, 48) + '…' : q.text}
                  </span>
                  <span className={`badge ${q.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {q.isActive ? tx(language, t.common.active) : tx(language, t.common.passive)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>💡 {tx(language, t.answerTemplates.deleteHint)}</div>
              <Link to={`/admin/questions?search=${encodeURIComponent(template.name)}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}
                onClick={() => setShow(false)}>{tx(language, t.answerTemplates.viewQuestions)}</Link>
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
        <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 16px rgba(16,185,129,.35)', display: 'flex', alignItems: 'center', gap: '8px' }}>✅ {successMsg}</div>
      )}

      <div className="page-header">
        <div><h1>{tx(language, t.answerTemplates.title)}</h1><p>{tx(language, t.answerTemplates.subtitle)}</p></div>
        <button className="btn btn-primary" onClick={openCreate}>{tx(language, t.answerTemplates.newTemplate)}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <span style={{ fontWeight: 600, color: '#4b5563' }}>{tx(language, t.answerTemplates.totalTemplates)}</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={pillStyle('active', '#15803d', '#fff', '#dcfce7', '#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} {tx(language, t.common.active)}</span>
            <span style={pillStyle('passive', '#6b7280', '#fff', '#f3f4f6', '#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} {tx(language, t.common.passive)}</span>
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{tx(language, t.answerTemplates.infoTitle)}</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>{tx(language, t.answerTemplates.infoDesc)}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{tx(language, t.answerTemplates.infoSub)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput value={search} placeholder={tx(language, t.answerTemplates.searchPlaceholder)}
            onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }} />
          {activeFilter !== 'all' && (
            <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>{tx(language, t.common.clearFilter)}</button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{tx(language, t.common.status)}</th>
                <th>{tx(language, t.answerTemplates.colName)}</th>
                <th>{tx(language, t.answerTemplates.colOptionCount)}</th>
                <th>{tx(language, t.answerTemplates.colOptions)}</th>
                <th>{tx(language, t.common.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((tpl, i) => {
                const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                return (
                  <>
                    <tr key={tpl.id}>
                      <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                      <td><span className={`badge ${tpl.isActive ? 'badge-success' : 'badge-secondary'}`}>{tpl.isActive ? tx(language, t.common.active) : tx(language, t.common.passive)}</span></td>
                      <td><strong>{tpl.name}</strong></td>
                      <td>{tpl.options.length}</td>
                      <td><div className="option-pills">{tpl.options.map(o => <span key={o.id} className="pill">{o.text}</span>)}</div></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(tpl, rowNum)}>{tx(language, t.common.edit)}</button>
                          {tpl.usedInQuestionsCount > 0 ? (
                            <DeletePopover template={tpl} usedQuestions={questions.filter(q => q.answerTemplateId === tpl.id)} />
                          ) : (
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tpl.id, rowNum)}>{tx(language, t.common.delete)}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {deleteError?.id === tpl.id && (
                      <tr key={`err-${tpl.id}`}>
                        <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#fff7ed', borderLeft: '4px solid #f97316', borderBottom: '1px solid #fed7aa', padding: '12px 16px' }}>
                            <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '1px' }}>🔒</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: '#c2410c', fontSize: '13px', marginBottom: '3px' }}>{tx(language, t.answerTemplates.errCannotDelete)}</div>
                              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}><strong>"{tpl.name}"</strong> {tx(language, t.answerTemplates.errUsedIn)}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{deleteError.detail}</div>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{tx(language, t.answerTemplates.errHint)}</div>
                            </div>
                            <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">{tx(language, t.common.notFound)}</div>}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} {language === 'tr' ? 'şablondan' : 'templates'} {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {tx(language, t.common.showing)}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>{tx(language, t.common.prev)}</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)} style={{ minWidth: '36px' }}>{p}</button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>{tx(language, t.common.next)}</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setError(''); setErrorType(''); }}>
          <div className={`modal${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `#${editRowNum} ${tx(language, t.answerTemplates.modalEdit)}` : tx(language, t.answerTemplates.modalCreate)}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setError(''); setErrorType(''); setErrorDetail(''); }}>×</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: errorType === 'duplicate' ? '#fff7ed' : errorType === 'passive_conflict' ? '#fefce8' : '#fef2f2',
                  border: `1px solid ${errorType === 'duplicate' ? '#fed7aa' : errorType === 'passive_conflict' ? '#fde047' : '#fecaca'}`,
                  borderLeft: `4px solid ${errorType === 'duplicate' ? '#f97316' : errorType === 'passive_conflict' ? '#eab308' : '#ef4444'}`,
                  borderRadius: '8px', padding: '12px 14px', marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{errorType === 'duplicate' ? '⚠️' : errorType === 'passive_conflict' ? '🔒' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: errorType === 'duplicate' ? '#c2410c' : errorType === 'passive_conflict' ? '#854d0e' : '#dc2626', marginBottom: '2px' }}>
                      {errorType === 'duplicate' ? tx(language, t.answerTemplates.dupTitle) : errorType === 'passive_conflict' ? tx(language, t.answerTemplates.passiveTitle) : tx(language, t.common.error)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                    {errorType === 'passive_conflict' && errorDetail && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>}
                    {errorType === 'passive_conflict' && <div style={{ fontSize: '12px', color: '#92400e', marginTop: '6px', fontWeight: 500 }}>{tx(language, t.answerTemplates.passiveHint)}</div>}
                    {errorType === 'duplicate' && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{tx(language, t.answerTemplates.dupHint)}</div>}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>{tx(language, t.answerTemplates.templateName)}</label>
                <input value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (errorType === 'duplicate') { setError(''); setErrorType(''); } }}
                  placeholder={tx(language, t.answerTemplates.templateNamePh)}
                  style={errorType === 'duplicate' ? { borderColor: '#f97316', boxShadow: '0 0 0 3px #fed7aa66' } : {}} />
              </div>
              <div className="form-group">
                <label>{tx(language, t.common.status)}</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">{tx(language, t.common.active)}</option>
                  <option value="false">{tx(language, t.common.passive)}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{tx(language, t.answerTemplates.options)} ({form.options.length}/4)</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="option-row">
                    <span className="option-num">{i + 1}.</span>
                    <input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`${tx(language, t.answerTemplates.optionPh)} ${i + 1}`} />
                    {form.options.length > 2 && <button className="btn btn-sm btn-danger" onClick={() => removeOption(i)}>×</button>}
                  </div>
                ))}
                {form.options.length < 4 && <button className="btn btn-sm btn-outline mt-2" onClick={addOption}>{tx(language, t.answerTemplates.addOption)}</button>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setShowModal(false); setError(''); setErrorType(''); }}>{tx(language, t.common.cancel)}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? tx(language, t.common.saving) : tx(language, t.common.save)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
