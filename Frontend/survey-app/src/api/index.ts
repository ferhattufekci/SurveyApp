import axios from 'axios';
import { useLanguageStore } from '../store/languageStore';
import type {
  User, AnswerTemplate, QuestionListItem, Question,
  SurveyListItem, SurveyDetail, UserSurvey, SurveyReport,
  CreateUserRequest, CreateAnswerTemplateRequest,
  CreateQuestionRequest, CreateSurveyRequest, SubmitSurveyRequest
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Alan adı çevirileri ───────────────────────────────────────────────────────
const FIELD_NAMES_TR: Record<string, string> = {
  Name:             'Ad',
  Email:            'E-posta',
  Password:         'Şifre',
  FullName:         'Ad Soyad',
  Role:             'Rol',
  Options:          'Seçenekler',
  Text:             'Metin',
  Title:            'Başlık',
  Description:      'Açıklama',
  StartDate:        'Başlangıç tarihi',
  EndDate:          'Bitiş tarihi',
  QuestionIds:      'Soru listesi',
  UserIds:          'Kullanıcı listesi',
  Answers:          'Cevaplar',
  AnswerTemplateId: 'Cevap şablonu',
  QuestionId:       'Soru',
  AnswerOptionId:   'Seçenek',
};

function translateMessage(field: string, message: string): string {
  const fieldTr = FIELD_NAMES_TR[field] ?? field;
  const m = message.toLowerCase();

  // "The X field is required." / "The X field is required"
  if (m.includes('required'))
    return `${fieldTr} zorunludur.`;

  // "The field X must be a string with a minimum length of 2 and a maximum length of 200."
  const minMaxMatch = message.match(/minimum length of (\d+) and a maximum length of (\d+)/i);
  if (minMaxMatch)
    return `${fieldTr} en az ${minMaxMatch[1]}, en fazla ${minMaxMatch[2]} karakter olmalıdır.`;

  // "The field X must be a string or array type with a minimum length of '2'."
  const minOnlyMatch = message.match(/minimum length of ['\s]?(\d+)/i);
  if (minOnlyMatch && !m.includes('maximum'))
    return `${fieldTr} en az ${minOnlyMatch[1]} öğe içermelidir.`;

  // "The field X must be a string or array type with a maximum length of '4'."
  const maxOnlyMatch = message.match(/maximum length of ['\s]?(\d+)/i);
  if (maxOnlyMatch && !m.includes('minimum'))
    return `${fieldTr} en fazla ${maxOnlyMatch[1]} öğe içerebilir.`;

  // "The X field is not a valid e-mail address."
  if (m.includes('e-mail') || m.includes('email'))
    return 'Geçerli bir e-posta adresi giriniz.';

  // "The field X must be between 1 and 2147483647."
  const rangeMatch = message.match(/must be between (\S+) and (\S+)/i);
  if (rangeMatch)
    return `${fieldTr} geçerli bir değer olmalıdır.`;

  // "The field X must match the regular expression ..."
  if (m.includes('regular expression') && field === 'Role')
    return "Rol 'Admin' veya 'User' olmalıdır.";

  return message; // bilinmeyen format → orijinali döndür
}

// ── Hata mesajı çıkarıcı ─────────────────────────────────────────────────────
// ASP.NET DataAnnotation hataları → { errors: { Field: ["msg"] } }
// Servis hataları                  → { message: "..." }
// İkisini de tek string'e çevirir.
export function extractErrorMessage(error: unknown): string {
  const language = useLanguageStore.getState().language;

  const e = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
  };

  const data = e?.response?.data;
  if (!data) return language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.';

  // ASP.NET validation format: { errors: { Field: ["msg", ...] } }
  if (data.errors) {
    const translated = Object.entries(data.errors)
      .flatMap(([field, msgs]) =>
        msgs.map(msg =>
          language === 'tr' ? translateMessage(field, msg) : msg
        )
      );
    return translated.join(' ');
  }

  // Servis hata formatı: { message: "..." } — bunlar zaten Türkçe geliyor
  return data.message ?? (language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.');
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
};

// ── Users (Admin) ─────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (): Promise<User[]> => api.get('/users').then(r => r.data),
  getById: (id: number): Promise<User> => api.get(`/users/${id}`).then(r => r.data),
  create: (data: CreateUserRequest): Promise<User> => api.post('/users', data).then(r => r.data),
  update: (id: number, data: { fullName: string; isActive: boolean }): Promise<User> =>
    api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// ── Answer Templates (Admin) ──────────────────────────────────────────────────
export const answerTemplatesApi = {
  getAll: (): Promise<AnswerTemplate[]> => api.get('/answertemplates').then(r => r.data),
  getById: (id: number): Promise<AnswerTemplate> => api.get(`/answertemplates/${id}`).then(r => r.data),
  create: (data: CreateAnswerTemplateRequest): Promise<AnswerTemplate> =>
    api.post('/answertemplates', data).then(r => r.data),
  update: (id: number, data: { name: string; isActive: boolean; options: { id?: number; text: string; orderIndex: number }[] }): Promise<AnswerTemplate> =>
    api.put(`/answertemplates/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/answertemplates/${id}`),
};

// ── Questions (Admin) ─────────────────────────────────────────────────────────
export const questionsApi = {
  getAll: (): Promise<QuestionListItem[]> => api.get('/questions').then(r => r.data),
  getById: (id: number): Promise<Question> => api.get(`/questions/${id}`).then(r => r.data),
  create: (data: CreateQuestionRequest): Promise<Question> =>
    api.post('/questions', data).then(r => r.data),
  update: (id: number, data: { text: string; answerTemplateId: number; isActive: boolean }): Promise<Question> =>
    api.put(`/questions/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/questions/${id}`),
};

// ── Surveys (Admin) ───────────────────────────────────────────────────────────
export const surveysApi = {
  getAll: (): Promise<SurveyListItem[]> => api.get('/surveys').then(r => r.data),
  getById: (id: number): Promise<SurveyDetail> => api.get(`/surveys/${id}`).then(r => r.data),
  create: (data: CreateSurveyRequest): Promise<SurveyDetail> =>
    api.post('/surveys', data).then(r => r.data),
  update: (id: number, data: CreateSurveyRequest): Promise<SurveyDetail> =>
    api.put(`/surveys/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/surveys/${id}`),
};

// ── Reports (Admin) ───────────────────────────────────────────────────────────
export const reportsApi = {
  getAll: (): Promise<SurveyListItem[]> => api.get('/reports').then(r => r.data),
  getSurveyReport: (surveyId: number): Promise<SurveyReport> =>
    api.get(`/reports/${surveyId}`).then(r => r.data),
};

// ── My Surveys (User) ─────────────────────────────────────────────────────────
export const mySurveysApi = {
  getAll: (): Promise<UserSurvey[]> => api.get('/my-surveys').then(r => r.data),
  getById: (id: number): Promise<SurveyDetail> => api.get(`/my-surveys/${id}`).then(r => r.data),
  getMyAnswers: (surveyId: number): Promise<{ questionId: number; answerOptionId: number }[]> =>
    api.get(`/my-surveys/${surveyId}/my-answers`).then(r => r.data),
  submit: (surveyId: number, data: SubmitSurveyRequest) =>
    api.post(`/my-surveys/${surveyId}/submit`, data).then(r => r.data),
};

export default api;