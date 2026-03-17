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

  if (data.errors) {
    const messages = Object.values(data.errors).flat();
    return messages.join(' ');
  }

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