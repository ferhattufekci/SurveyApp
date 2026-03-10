import axios from 'axios';

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

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
};

// Users (Admin)
export const usersApi = {
  getAll: () => api.get('/users').then(r => r.data),
  getById: (id: number) => api.get(`/users/${id}`).then(r => r.data),
  create: (data: any) => api.post('/users', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Answer Templates (Admin)
export const answerTemplatesApi = {
  getAll: () => api.get('/answertemplates').then(r => r.data),
  getById: (id: number) => api.get(`/answertemplates/${id}`).then(r => r.data),
  create: (data: any) => api.post('/answertemplates', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/answertemplates/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/answertemplates/${id}`),
};

// Questions (Admin)
export const questionsApi = {
  getAll: () => api.get('/questions').then(r => r.data),
  getById: (id: number) => api.get(`/questions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/questions', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/questions/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/questions/${id}`),
};

// Surveys (Admin)
export const surveysApi = {
  getAll: () => api.get('/surveys').then(r => r.data),
  getById: (id: number) => api.get(`/surveys/${id}`).then(r => r.data),
  create: (data: any) => api.post('/surveys', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/surveys/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/surveys/${id}`),
};

// Reports (Admin)
export const reportsApi = {
  getAll: () => api.get('/reports').then(r => r.data),
  getSurveyReport: (surveyId: number) => api.get(`/reports/${surveyId}`).then(r => r.data),
};

// My Surveys (User)
export const mySurveysApi = {
  getAll: () => api.get('/my-surveys').then(r => r.data),
  getById: (id: number) => api.get(`/my-surveys/${id}`).then(r => r.data),
  submit: (surveyId: number, data: any) => api.post(`/my-surveys/${surveyId}/submit`, data).then(r => r.data),
};

export default api;
