import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mySurveysApi } from '../../api';
import type { UserSurvey, SurveyDetail } from '../../types';
import { useAuthStore } from '../../store/authStore';

const PAGE_SIZE = 8;

// Bir ankete ait kullanıcı cevaplarını lazy load eden hook
function useSurveyAnswers(surveyId: number, enabled: boolean) {
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> optionId
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    mySurveysApi.getMyAnswers(surveyId).then(data => {
      const map: Record<number, number> = {};
      data.forEach(a => { map[a.questionId] = a.answerOptionId; });
      setAnswers(map);
      setLoaded(true);
    });
  }, [enabled, surveyId, loaded]);

  return answers;
}

// Tamamlanan anket kartı — seçilen cevapları yeşil gösterir
function CompletedSurveyCard({ survey }: { survey: UserSurvey }) {
  const [expanded, setExpanded] = useState(false);
  const answers = useSurveyAnswers(survey.id, expanded);

  return (
    <div>
      {/* Başlık satırı + açıkla/kapat */}
      <div style={{ marginBottom: (survey.questions || []).length > 0 ? '8px' : 0 }}>
        <strong style={{ fontSize: '14px' }}>{survey.title}</strong>
        {survey.description && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {survey.description.length > 70 ? survey.description.substring(0, 70) + '…' : survey.description}
          </div>
        )}
      </div>

      {(survey.questions || []).length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600, color: '#10b981',
              background: '#f0fdf4', border: '1px solid #6ee7b7',
              borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', marginBottom: '6px',
            }}
          >
            {expanded ? '▲ Cevaplarımı Gizle' : '▼ Cevaplarımı Gör'}
          </button>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(survey.questions || []).map((sq, qi) => {
                const selectedId = answers[sq.questionId];
                return (
                  <div key={sq.questionId} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '8px 10px',
                  }}>
                    {/* Soru başlığı */}
                    <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 600, marginBottom: '6px', display: 'flex', gap: '5px' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '16px' }}>{qi + 1}.</span>
                      <span>{sq.questionText}</span>
                    </div>
                    {/* Şablon adı */}
                    <div style={{ paddingLeft: '21px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '10px', background: '#eef2ff', color: '#6366f1', borderRadius: '4px', padding: '1px 7px', fontWeight: 600 }}>
                        {sq.answerTemplate.name} · {sq.answerTemplate.options.length} seçenek
                      </span>
                    </div>
                    {/* Seçenekler — seçilen yeşil */}
                    <div style={{ paddingLeft: '21px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {sq.answerTemplate.options.map(o => {
                        const isSelected = o.id === selectedId;
                        return (
                          <span key={o.id} style={{
                            fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
                            background: isSelected ? '#d1fae5' : '#f1f5f9',
                            color: isSelected ? '#065f46' : '#64748b',
                            border: `1px solid ${isSelected ? '#6ee7b7' : '#e2e8f0'}`,
                            fontWeight: isSelected ? 700 : 400,
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.15s',
                          }}>
                            {isSelected && <span style={{ fontSize: '11px' }}>✓</span>}
                            {o.text}
                          </span>
                        );
                      })}
                      {!selectedId && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Yükleniyor...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Aktif/yaklaşan/geçmiş anket için soru+şablon önizleme
function SurveyQuestionPreview({ survey }: { survey: UserSurvey }) {
  const qs = survey.questions || [];
  return (
    <div>
      <div style={{ marginBottom: qs.length > 0 ? '8px' : 0 }}>
        <strong style={{ fontSize: '14px' }}>{survey.title}</strong>
        {survey.description && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {survey.description.length > 70 ? survey.description.substring(0, 70) + '…' : survey.description}
          </div>
        )}
      </div>
      {qs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {qs.map((sq, qi) => (
            <div key={sq.questionId} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '7px', padding: '7px 10px',
            }}>
              <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500, marginBottom: '4px', display: 'flex', gap: '5px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: '16px' }}>{qi + 1}.</span>
                <span>{sq.questionText}</span>
              </div>
              <div style={{ paddingLeft: '21px', display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', background: '#eef2ff', color: '#6366f1', borderRadius: '4px', padding: '1px 6px', fontWeight: 600 }}>
                  {sq.answerTemplate.name}
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>· {sq.answerTemplate.options.length} seçenek:</span>
                {sq.answerTemplate.options.map(o => (
                  <span key={o.id} style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', padding: '1px 5px', border: '1px solid #e2e8f0' }}>
                    {o.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserSurveysListPage() {
  const [surveys, setSurveys] = useState<UserSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'active' | 'completed' | 'upcoming' | 'expired'>('active');
  const [page, setPage]       = useState(1);
  const { user, logout }      = useAuthStore();
  const navigate = useNavigate();
  const isPassive = user && !user.isActive;

  useEffect(() => { mySurveysApi.getAll().then(setSurveys).finally(() => setLoading(false)); }, []);

  const now = new Date();
  const active    = surveys.filter(s => !s.isCompleted && new Date(s.startDate) <= now && new Date(s.endDate) >= now);
  const completed = surveys.filter(s => s.isCompleted);
  const upcoming  = surveys.filter(s => !s.isCompleted && new Date(s.startDate) > now);
  const expired   = surveys.filter(s => !s.isCompleted && new Date(s.endDate) < now);

  const grouped: Record<string, UserSurvey[]> = { active, completed, upcoming, expired };
  const tabList = [
    { key: 'active',    label: '🟢 Aktif',        count: active.length },
    { key: 'completed', label: '✅ Tamamlanan',    count: completed.length },
    { key: 'upcoming',  label: '🕐 Yaklaşan',     count: upcoming.length },
    { key: 'expired',   label: '⏰ Süresi Geçen', count: expired.length },
  ] as const;

  const filtered = (grouped[tab] || []).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)) return true;
    return (s.questions || []).some(sq =>
      sq.questionText.toLowerCase().includes(q) ||
      sq.answerTemplate.name.toLowerCase().includes(q) ||
      sq.answerTemplate.options.some(o => o.text.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusBadge = (s: UserSurvey) => {
    if (s.isCompleted) return <span className="badge badge-secondary">Tamamlandı</span>;
    if (new Date(s.startDate) > now) return <span className="badge badge-warning">Yakında</span>;
    if (new Date(s.endDate) < now) return <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Süresi Geçti</span>;
    return <span className="badge badge-success">Aktif</span>;
  };

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;

  return (
    <div className="user-layout">
      <header className="user-header">
        <div className="user-header-logo">
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#2563EB"/>
            <path d="M8 10h16M8 15h11M8 20h13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>SurveyApp</span>
        </div>
        <div className="user-header-right">
          <span style={{ fontSize: '14px', color: '#4b5563' }}>👋 {user?.fullName}</span>
          {isPassive && (
            <span style={{
              background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
            }}>Pasif Hesap</span>
          )}
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dc2626'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
          >🚪 Çıkış</button>
        </div>
      </header>

      <div className="user-content">
        <div className="page-header">
          <div><h1>Anketlerim</h1><p>Size atanan anketleri görüntüleyin ve doldurun</p></div>
        </div>

        {isPassive && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde047', borderLeft: '4px solid #eab308',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#854d0e', marginBottom: '2px' }}>Hesabınız pasif durumda</div>
              <div style={{ fontSize: '13px', color: '#92400e' }}>Anketleri görüntüleyebilirsiniz, ancak anket dolduramaz ve yanıt gönderemezsiniz.</div>
            </div>
          </div>
        )}

        {/* Tab sayaçlar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {tabList.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key as any); setPage(1); setSearch(''); }}
              style={{
                background: tab === t.key ? '#eef2ff' : 'white',
                border: `2px solid ${tab === t.key ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: '10px', padding: '12px', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: tab === t.key ? '#6366f1' : '#374151' }}>{t.count}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* Arama */}
        <div style={{ marginBottom: '12px' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Başlık, açıklama, soru metni, şablon veya seçenek ara..."
            style={{
              width: '100%', padding: '9px 14px', borderRadius: '8px',
              border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Durum</th>
                  <th>Anket Adı & Sorular</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                    {search ? 'Arama sonucu bulunamadı.' : 'Bu kategoride anket yok.'}
                  </td></tr>
                ) : paginated.map((s, i) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                  const canFill = !s.isCompleted && !isPassive && new Date(s.startDate) <= now && new Date(s.endDate) >= now;
                  return (
                    <tr key={s.id}>
                      <td className="text-muted" style={{ fontWeight: 600, verticalAlign: 'top', paddingTop: '14px' }}>{rowNum}</td>
                      <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>{statusBadge(s)}</td>
                      <td>
                        {/* Tamamlanan: cevap gösterimi; diğerleri: soru önizleme */}
                        {s.isCompleted
                          ? <CompletedSurveyCard survey={s} />
                          : <SurveyQuestionPreview survey={s} />
                        }
                      </td>
                      <td style={{ fontSize: '13px', color: '#6b7280', verticalAlign: 'top', paddingTop: '14px' }}>{new Date(s.startDate).toLocaleDateString('tr-TR')}</td>
                      <td style={{ fontSize: '13px', color: '#6b7280', verticalAlign: 'top', paddingTop: '14px' }}>{new Date(s.endDate).toLocaleDateString('tr-TR')}</td>
                      <td style={{ verticalAlign: 'top', paddingTop: '12px' }}>
                        {canFill ? (
                          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/user/surveys/${s.id}`)}>Doldur →</button>
                        ) : s.isCompleted ? (
                          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>✓ Tamamlandı</span>
                        ) : isPassive ? (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>Pasif hesap</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {filtered.length} anket — {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPage(p)} style={{ minWidth: '32px' }}>{p}</button>
                ))}
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              </div>
            </div>
          )}
        </div>

        {surveys.length === 0 && (
          <div className="empty-full">
            <div className="empty-icon">📋</div>
            <h3>Henüz anket atanmamış</h3>
            <p>Size atanan anketler burada görünecek.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function FillSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isPassive = user && !user.isActive;

  useEffect(() => {
    mySurveysApi.getById(Number(id)).then(setSurvey).catch(() => navigate('/user/surveys')).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (isPassive) { setError('Pasif hesapla anket doldurulamaz.'); return; }
    if (Object.keys(answers).length !== survey?.questions.length) { setError('Lütfen tüm soruları cevaplayın.'); return; }
    setSubmitting(true);
    try {
      await mySurveysApi.submit(Number(id), {
        surveyId: Number(id),
        answers: Object.entries(answers).map(([qId, aId]) => ({ questionId: Number(qId), answerOptionId: Number(aId) }))
      });
      navigate('/user/surveys');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gönderim sırasında hata oluştu.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner-large"></div></div>;
  if (!survey) return null;

  const answered = Object.keys(answers).length;
  const total = survey.questions.length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  return (
    <div className="user-layout">
      <header className="user-header">
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/user/surveys')}>← Geri</button>
        <div className="survey-progress-header">
          <span>{answered}/{total} soru cevaplanıyor</span>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </header>

      <div className="user-content fill-survey-content">
        <div className="survey-title-card">
          <h1>{survey.title}</h1>
          <p>{survey.description}</p>
          <div className="survey-dates">
            <span>📅 {new Date(survey.startDate).toLocaleDateString('tr-TR')} - {new Date(survey.endDate).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>

        {isPassive && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde047', borderLeft: '4px solid #eab308', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
            ⚠️ <strong>Pasif hesabınızla anket gönderemezsiniz.</strong> Yöneticinize başvurun.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="questions-list">
          {survey.questions.map((q, idx) => (
            <div key={q.questionId} className={`question-card ${answers[q.questionId] ? 'answered' : ''}`}>
              <div className="question-number">{idx + 1}</div>
              <div className="question-body">
                <h3>{q.questionText}</h3>
                <div className="options-grid">
                  {q.answerTemplate.options.map(opt => (
                    <label key={opt.id} className={`option-label ${answers[q.questionId] === opt.id ? 'selected' : ''} ${isPassive ? 'disabled' : ''}`}>
                      <input type="radio" name={`q-${q.questionId}`} value={opt.id}
                        checked={answers[q.questionId] === opt.id}
                        disabled={!!isPassive}
                        onChange={() => !isPassive && setAnswers(a => ({ ...a, [q.questionId]: opt.id }))}
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="submit-section">
          <button className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting || answered !== total || !!isPassive}
          >
            {submitting ? 'Gönderiliyor...' : `Anketi Gönder (${answered}/${total})`}
          </button>
          {isPassive && <p style={{ marginTop: '8px', fontSize: '13px', color: '#9ca3af' }}>Pasif hesapla anket gönderilemez.</p>}
        </div>
      </div>
    </div>
  );
}
