import SearchInput from '../../components/admin/SearchInput';
import { useEffect, useState, useRef } from 'react';
import { questionsApi, answerTemplatesApi, surveysApi, extractErrorMessage } from '../../api';
import type { QuestionListItem, AnswerTemplate, SurveyListItem } from '../../types';
import { Link, useLocation } from 'react-router-dom';
import { useLanguageStore } from '../../store/languageStore';
import { t, tx } from '../../i18n/translations';

type FilterKey = 'all' | 'active' | 'passive';
const PAGE_SIZE = 8;
const Req = () => <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>;

// ── SearchableTemplateSelect ──────────────────────────────────────────────────
interface SearchableSelectOption {
  id: number;
  name: string;
  optionsCount: number;
}

interface SearchableTemplateSelectProps {
  value: number;
  onChange: (id: number) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  optionCountLabel: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
}

function SearchableTemplateSelect({
  value,
  onChange,
  options,
  placeholder,
  optionCountLabel,
  searchPlaceholder = 'Ara...',
  noResultsLabel = 'Sonuç bulunamadı',
}: SearchableTemplateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Alfabetik sıralama (Türkçe karakter desteğiyle)
  const sorted = [...options].sort((a, b) =>
    a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })
  );
  const filtered = sorted.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = options.find(o => o.id === value);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '9px 12px',
          border: `1.5px solid ${open ? 'var(--primary)' : '#d1d5db'}`,
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff',
          fontSize: '14px',
          color: selected ? '#1f2937' : '#9ca3af',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected
            ? `${selected.name} (${selected.optionsCount} ${optionCountLabel})`
            : placeholder}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1.5px solid #d1d5db',
            borderRadius: 'var(--radius)',
            zIndex: 300,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            overflow: 'hidden',
          }}
        >
          {/* Arama inputu */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                background: '#fff',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Seçenek listesi */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                {noResultsLabel}
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.id === value;
                return (
                  <div
                    key={opt.id}
                    onClick={() => { onChange(opt.id); setOpen(false); setSearch(''); }}
                    style={{
                      padding: '9px 12px',
                      cursor: 'pointer',
                      background: isSelected ? '#eef2ff' : 'transparent',
                      color: isSelected ? '#4338ca' : '#374151',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '13px',
                      borderBottom: '1px solid #f9fafb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background = '#f5f3ff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background =
                        isSelected ? '#eef2ff' : 'transparent';
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {opt.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#f3f4f6',
                        color: '#6b7280',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        flexShrink: 0,
                      }}
                    >
                      {opt.optionsCount} {optionCountLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function QuestionsPage() {
  const location = useLocation();
  const { language } = useLanguageStore();
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
  const [search, setSearch]         = useState(() => { const p = new URLSearchParams(location.search); return p.get('search') || ''; });
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage]             = useState(1);
  const [deleteError, setDeleteError] = useState<{ id: number; count: number; detail: string } | null>(null);
  const [editRowNum, setEditRowNum]   = useState(0);
  const [successMsg, setSuccessMsg]   = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const load = () =>
    Promise.all([questionsApi.getAll(), answerTemplatesApi.getAll(), surveysApi.getAll()])
      .then(([q, tpl, s]) => { setQuestions(q); setTemplates(tpl); setSurveys(s); })
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const closeModal = () => { setShowModal(false); setError(''); setErrorType(''); setErrorDetail(''); };
  const openCreate = () => { setEditItem(null); setForm({ text: '', answerTemplateId: templates.filter(t => t.isActive)[0]?.id || 0, isActive: true }); setError(''); setErrorType(''); setShowModal(true); };
  const openEdit = (q: QuestionListItem, rowNum: number) => { setEditItem(q); setEditRowNum(rowNum); setForm({ text: q.text, answerTemplateId: q.answerTemplateId, isActive: q.isActive }); setError(''); setErrorType(''); setShowModal(true); };

  const handleSave = async () => {
    setError(''); setErrorType(''); setErrorDetail('');
    if (!form.text.trim()) { setError(tx(language, t.questions.errTextRequired)); setErrorType('general'); return; }
    if (!form.answerTemplateId) { setError(tx(language, t.questions.errTemplateReq)); setErrorType('general'); return; }
    setSaving(true);
    try {
      if (editItem) await questionsApi.update(editItem.id, { text: form.text, answerTemplateId: form.answerTemplateId, isActive: form.isActive });
      else await questionsApi.create({ text: form.text, answerTemplateId: form.answerTemplateId, isActive: form.isActive });
      closeModal();
      showSuccess(editItem ? tx(language, t.questions.successUpdate) : tx(language, t.questions.successCreate));
      load();
    } catch (e: any) {
      const msg = extractErrorMessage(e);
      const parts = msg.split('|');
      const isDup = msg.toLowerCase().includes('zaten bir soru') || msg.toLowerCase().includes('already exists');
      const isPC  = parts.length === 3 && (msg.toLowerCase().includes('aktif ankette') || msg.toLowerCase().includes('active survey'));
      setError(isPC ? parts[0] : msg); setErrorType(isPC ? 'passive_conflict' : isDup ? 'duplicate' : 'general');
      if (isPC) setErrorDetail(parts[2]);
      setShake(true); setTimeout(() => setShake(false), 600);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, rowNum: number) => {
    setDeleteError(null);
    if (!confirm(`${rowNum} ${tx(language, t.questions.deleteConfirm)}`)) return;
    try { await questionsApi.delete(id); load(); showSuccess(`${rowNum} ${tx(language, t.questions.successDelete)}`); }
    catch (e: any) {
      const msg: string = e.response?.data?.message || '';
      const parts = msg.split('|');
      setDeleteError(parts.length === 3 ? { id, count: parseInt(parts[1]), detail: parts[2] } : { id, count: 0, detail: msg });
      setTimeout(() => setDeleteError(null), 8000);
    }
  };

  // ── Toplam Soru → hepsini göster ────────────────────────────────────────
  const handleTotalClick  = () => { setActiveFilter('all'); setSearch(''); setPage(1); };
  const handleFilterClick = (key: FilterKey) => { setActiveFilter(prev => prev === key ? 'all' : key); setSearch(''); setPage(1); };

  const totalCount   = questions.length;
  const activeCount  = questions.filter(q => q.isActive).length;
  const passiveCount = questions.filter(q => !q.isActive).length;
  const templateMap  = new Map<number, AnswerTemplate>(templates.map(tpl => [tpl.id, tpl]));

  const filtered = questions.filter(q => {
    const ok = activeFilter === 'active' ? q.isActive : activeFilter === 'passive' ? !q.isActive : true;
    if (!ok) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const st = q.isActive ? `${tx(language, t.common.active).toLowerCase()} active` : `${tx(language, t.common.passive).toLowerCase()} passive`;
    const tpl = templateMap.get(q.answerTemplateId);
    const opts = tpl ? tpl.options.map((o: { text: string }) => o.text).join(' ') : '';
    return q.text.toLowerCase().includes(s) || q.answerTemplateName.toLowerCase().includes(s) || st.includes(s) || opts.toLowerCase().includes(s);
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

  function DeletePopover({ question, usedSurveys }: { question: QuestionListItem; usedSurveys: SurveyListItem[] }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLSpanElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hide = () => { timer.current = setTimeout(() => setShow(false), 120); };
    const keep = () => { if (timer.current) clearTimeout(timer.current); };
    const enter = () => { keep(); if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.top + window.scrollY, left: r.right + window.scrollX }); } setShow(true); };
    return (
      <>
        <span ref={ref} style={{ display: 'inline-block' }} onMouseEnter={enter} onMouseLeave={hide}>
          <button style={{ opacity: 0.45, pointerEvents: 'none', cursor: 'not-allowed' }} className="btn btn-sm btn-danger">{tx(language, t.common.delete)}</button>
        </span>
        {show && (
          <div onMouseEnter={keep} onMouseLeave={hide} style={{ position: 'fixed', top: pos.top - 10, left: pos.left - 310, width: '300px', background: '#fff', borderRadius: '10px', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.2)', border: '1px solid #e5e7eb', overflow: 'hidden', transform: 'translateY(-100%)' }}>
            <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 14px', display: 'flex', gap: '8px' }}>
              <span>🔒</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#c2410c' }}>{tx(language, t.questions.cannotDelete)}</div>
                <div style={{ fontSize: '12px', color: '#9a3412' }}><strong>{usedSurveys.length}</strong> {tx(language, t.questions.usedIn)}</div>
              </div>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '8px 0' }}>
              {usedSurveys.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderBottom: i < usedSurveys.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', minWidth: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#374151' }}>{s.title.length > 40 ? s.title.substring(0, 40) + '…' : s.title}</span>
                  <span className={`badge ${s.isActive ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>{s.isActive ? tx(language, t.common.active) : tx(language, t.common.passive)}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>💡 {tx(language, t.questions.deleteHint)}</div>
              <Link to={`/admin/surveys?search=${encodeURIComponent(question.text.substring(0, 30))}`} style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }} onClick={() => setShow(false)}>{tx(language, t.questions.viewSurveys)}</Link>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page">
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}}.modal-shake{animation:shake 0.6s ease;}`}</style>

      {successMsg && <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999, background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 16px rgba(16,185,129,.35)' }}>✅ {successMsg}</div>}

      <div className="page-header">
        <div><h1>{tx(language, t.questions.title)}</h1><p>{tx(language, t.questions.subtitle)}</p></div>
        <button className="btn btn-primary" onClick={openCreate}>{tx(language, t.questions.newQuestion)}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#eef2ff', border: '1px solid #6366f122', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>❓</span>
            <span style={totalStyle} onClick={handleTotalClick}>{tx(language, t.questions.totalQuestions)}</span>
            <span style={{ marginLeft: 'auto', fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={pill('active',  '#15803d','#fff','#dcfce7','#15803d')} onClick={() => handleFilterClick('active')}>✅ {activeCount} {tx(language, t.common.active)}</span>
            <span style={pill('passive', '#6b7280','#fff','#f3f4f6','#6b7280')} onClick={() => handleFilterClick('passive')}>⏸ {passiveCount} {tx(language, t.common.passive)}</span>
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #10b98122', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{tx(language, t.questions.infoTitle)}</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>{tx(language, t.questions.infoDesc)}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{tx(language, t.questions.infoSub)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-toolbar">
          <SearchInput value={search} placeholder={tx(language, t.questions.searchPlaceholder)} onChange={v => { setSearch(v); setActiveFilter('all'); setPage(1); }} />
          {activeFilter !== 'all' && <button className="btn btn-sm btn-outline" onClick={() => { setActiveFilter('all'); setPage(1); }}>{tx(language, t.common.clearFilter)}</button>}
        </div>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>#</th><th>{tx(language, t.common.status)}</th><th>{tx(language, t.questions.colText)}</th><th>{tx(language, t.questions.colTemplate)}</th><th>{tx(language, t.questions.colOptions)}</th><th>{tx(language, t.common.actions)}</th></tr></thead>
            <tbody>
              {paginated.map((q, i) => {
                const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                const tpl = templateMap.get(q.answerTemplateId);
                return (
                  <>
                    <tr key={q.id}>
                      <td className="text-muted" style={{ fontWeight: 600 }}>{rowNum}</td>
                      <td><span className={`badge ${q.isActive ? 'badge-success' : 'badge-secondary'}`}>{q.isActive ? tx(language, t.common.active) : tx(language, t.common.passive)}</span></td>
                      <td>{q.text}</td>
                      <td><span className="pill">{q.answerTemplateName}</span></td>
                      <td>
                        {tpl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{tpl.options.length} {tx(language, t.questions.optionCount)}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {tpl.options.map((o: { id: number; text: string }) => <span key={o.id} className="pill" style={{ fontSize: '11px', padding: '2px 7px' }}>{o.text}</span>)}
                            </div>
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(q, rowNum)}>{tx(language, t.common.edit)}</button>
                          {q.usedInSurveysCount > 0
                            ? <DeletePopover question={q} usedSurveys={surveys.filter(s => s.questionIds?.includes(q.id))} />
                            : <button className="btn btn-sm btn-danger" onClick={() => handleDelete(q.id, rowNum)}>{tx(language, t.common.delete)}</button>}
                        </div>
                      </td>
                    </tr>
                    {deleteError?.id === q.id && (
                      <tr key={`err-${q.id}`}><td colSpan={6} style={{ padding: 0, border: 'none' }}>
                        <div style={{ display: 'flex', gap: '12px', background: '#fff7ed', borderLeft: '4px solid #f97316', padding: '12px 16px' }}>
                          <span>🔒</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#c2410c', fontSize: '13px', marginBottom: '3px' }}>{tx(language, t.questions.errCannotDelete)}</div>
                            <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>{tx(language, t.questions.errUsedIn)}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{deleteError.detail}</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{tx(language, t.questions.errHint)}</div>
                          </div>
                          <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}>×</button>
                        </div>
                      </td></tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state">{tx(language, t.common.notFound)}</div>}
        </div>
        {totalPages > 1 && (
          <div className="pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{filtered.length} {language === 'tr' ? 'sorudan' : 'questions'} {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {tx(language, t.common.showing)}</span>
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
          <div className={`modal${shake ? ' modal-shake' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `#${editRowNum} ${tx(language, t.questions.modalEdit)}` : tx(language, t.questions.modalCreate)}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ display: 'flex', gap: '10px', background: errorType === 'duplicate' ? '#fff7ed' : errorType === 'passive_conflict' ? '#fefce8' : '#fef2f2', border: `1px solid ${errorType === 'duplicate' ? '#fed7aa' : errorType === 'passive_conflict' ? '#fde047' : '#fecaca'}`, borderLeft: `4px solid ${errorType === 'duplicate' ? '#f97316' : errorType === 'passive_conflict' ? '#eab308' : '#ef4444'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{errorType === 'duplicate' ? '⚠️' : errorType === 'passive_conflict' ? '🔒' : '❌'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: errorType === 'duplicate' ? '#c2410c' : errorType === 'passive_conflict' ? '#854d0e' : '#dc2626', marginBottom: '2px' }}>
                      {errorType === 'duplicate' ? tx(language, t.questions.dupTitle) : errorType === 'passive_conflict' ? tx(language, t.questions.passiveTitle) : tx(language, t.common.error)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{error}</div>
                    {errorType === 'passive_conflict' && errorDetail && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{errorDetail}</div>}
                    {errorType === 'passive_conflict' && <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500, marginTop: '6px' }}>{tx(language, t.questions.passiveHint)}</div>}
                    {errorType === 'duplicate' && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{tx(language, t.questions.dupHint)}</div>}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>{tx(language, t.questions.questionText)}<Req /></label>
                <textarea rows={3} value={form.text} onChange={e => { setForm(f => ({ ...f, text: e.target.value })); if (errorType === 'duplicate') { setError(''); setErrorType(''); } }} placeholder={tx(language, t.questions.questionTextPh)} style={errorType === 'duplicate' ? { borderColor: '#f97316', boxShadow: '0 0 0 3px #fed7aa66' } : {}} />
              </div>

              {/* ── Aranabilir & Alfabetik Cevap Şablonu ── */}
              <div className="form-group">
                <label>{tx(language, t.questions.templateLabel)}<Req /></label>
                <SearchableTemplateSelect
                  value={form.answerTemplateId}
                  onChange={id => setForm(f => ({ ...f, answerTemplateId: id }))}
                  options={templates
                    .filter(tpl => tpl.isActive)
                    .map(tpl => ({ id: tpl.id, name: tpl.name, optionsCount: tpl.options.length }))}
                  placeholder={tx(language, t.questions.templateSelect)}
                  optionCountLabel={tx(language, t.questions.optionCount)}
                  searchPlaceholder={language === 'tr' ? 'Şablon ara...' : 'Search template...'}
                  noResultsLabel={language === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}
                />
              </div>

              <div className="form-group">
                <label>{tx(language, t.common.status)}</label>
                <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">{tx(language, t.common.active)}</option>
                  <option value="false">{tx(language, t.common.passive)}</option>
                </select>
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
