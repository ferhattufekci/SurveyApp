import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mySurveysApi } from '../../api';
import type { UserSurvey, SurveyDetail } from '../../types';
import { useAuthStore } from '../../store/authStore';

export function UserSurveysListPage() {
  const [surveys, setSurveys] = useState<UserSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { mySurveysApi.getAll().then(setSurveys).finally(() => setLoading(false)); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const now = new Date();
  const active = surveys.filter(s => !s.isCompleted && new Date(s.startDate) <= now && new Date(s.endDate) >= now);
  const completed = surveys.filter(s => s.isCompleted);
  const upcoming = surveys.filter(s => !s.isCompleted && new Date(s.startDate) > now);
  const expired = surveys.filter(s => !s.isCompleted && new Date(s.endDate) < now);

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
          <span>👋 {user?.fullName}</span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Çıkış</button>
        </div>
      </header>

      <div className="user-content">
        <div className="page-header">
          <div><h1>Anketlerim</h1><p>Size atanan anketleri görüntüleyin ve doldurun</p></div>
        </div>

        {active.length > 0 && (
          <div className="survey-section">
            <h2 className="section-title">🟢 Aktif Anketler</h2>
            <div className="survey-cards">
              {active.map(s => (
                <div key={s.id} className="survey-card">
                  <div className="survey-card-header">
                    <h3>{s.title}</h3>
                    <span className="badge badge-success">Aktif</span>
                  </div>
                  <p>{s.description}</p>
                  <div className="survey-card-meta">
                    <span>📅 {new Date(s.endDate).toLocaleDateString('tr-TR')}'e kadar</span>
                  </div>
                  <button className="btn btn-primary btn-full mt-3" onClick={() => navigate(`/user/surveys/${s.id}`)}>
                    Anketi Doldur →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div className="survey-section">
            <h2 className="section-title">✅ Tamamlanan Anketler</h2>
            <div className="survey-cards">
              {completed.map(s => (
                <div key={s.id} className="survey-card survey-card-completed">
                  <div className="survey-card-header">
                    <h3>{s.title}</h3>
                    <span className="badge badge-secondary">Tamamlandı</span>
                  </div>
                  <p>{s.description}</p>
                  <div className="completed-check">✓ Dolduruldu</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="survey-section">
            <h2 className="section-title">🕐 Yaklaşan Anketler</h2>
            <div className="survey-cards">
              {upcoming.map(s => (
                <div key={s.id} className="survey-card survey-card-upcoming">
                  <div className="survey-card-header">
                    <h3>{s.title}</h3>
                    <span className="badge badge-warning">Yakında</span>
                  </div>
                  <p>{s.description}</p>
                  <div className="survey-card-meta">
                    <span>📅 {new Date(s.startDate).toLocaleDateString('tr-TR')}'de başlıyor</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    mySurveysApi.getById(Number(id)).then(setSurvey).catch(() => navigate('/user/surveys')).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== survey?.questions.length) {
      setError('Lütfen tüm soruları cevaplayın.');
      return;
    }
    setSubmitting(true);
    try {
      await mySurveysApi.submit(Number(id), {
        surveyId: Number(id),
        answers: Object.entries(answers).map(([qId, aId]) => ({ questionId: Number(qId), answerOptionId: aId }))
      });
      navigate('/user/surveys');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gönderim sırasında hata oluştu.');
    } finally {
      setSubmitting(false);
    }
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

        {error && <div className="alert alert-error">{error}</div>}

        <div className="questions-list">
          {survey.questions.map((q, idx) => (
            <div key={q.questionId} className={`question-card ${answers[q.questionId] ? 'answered' : ''}`}>
              <div className="question-number">{idx + 1}</div>
              <div className="question-body">
                <h3>{q.questionText}</h3>
                <div className="options-grid">
                  {q.answerTemplate.options.map(opt => (
                    <label key={opt.id} className={`option-label ${answers[q.questionId] === opt.id ? 'selected' : ''}`}>
                      <input
                        type="radio" name={`q-${q.questionId}`}
                        value={opt.id}
                        checked={answers[q.questionId] === opt.id}
                        onChange={() => setAnswers(a => ({ ...a, [q.questionId]: opt.id }))}
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
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting || answered !== total}
          >
            {submitting ? 'Gönderiliyor...' : `Anketi Gönder (${answered}/${total})`}
          </button>
        </div>
      </div>
    </div>
  );
}
