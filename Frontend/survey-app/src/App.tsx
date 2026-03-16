import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/auth/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import AnswerTemplatesPage from './pages/admin/AnswerTemplatesPage';
import QuestionsPage from './pages/admin/QuestionsPage';
import SurveysPage from './pages/admin/SurveysPage';
import UsersPage from './pages/admin/UsersPage';
import { ReportsListPage, SurveyReportPage } from './pages/admin/ReportsPage';
import { UserSurveysListPage, FillSurveyPage } from './pages/user/UserSurveysPage';

// FIX 9: JSX.Element yerine React.ReactNode kullanıldı (React 18 uyumlu)
function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { initFromStorage } = useAuthStore();

  // FIX 10: initFromStorage dependency array'e eklendi
  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={
          <RequireAuth role="Admin"><AdminLayout /></RequireAuth>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="answer-templates" element={<AnswerTemplatesPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsListPage />} />
          <Route path="reports/:id" element={<SurveyReportPage />} />
        </Route>

        <Route path="/user/surveys" element={
          <RequireAuth role="User"><UserSurveysListPage /></RequireAuth>
        } />
        <Route path="/user/surveys/:id" element={
          <RequireAuth role="User"><FillSurveyPage /></RequireAuth>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}