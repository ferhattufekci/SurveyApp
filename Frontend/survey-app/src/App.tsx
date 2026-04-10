import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/auth/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import AnswerTemplatesPage from './pages/admin/AnswerTemplatesPage';
import QuestionsPage from './pages/admin/QuestionsPage';
import SurveysPage from './pages/admin/SurveysPage';
import UsersPage from './pages/admin/UsersPage';
import { ReportsListPage, SurveyReportPage } from './pages/admin/ReportsPage';
import { UserSurveysListPage, FillSurveyPage } from './pages/user/UserSurveysPage';

function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { initFromStorage } = useAuthStore();

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={
            <RequireAuth role="Admin"><AdminLayout /></RequireAuth>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="answer-templates" element={<ErrorBoundary><AnswerTemplatesPage /></ErrorBoundary>} />
            <Route path="questions" element={<ErrorBoundary><QuestionsPage /></ErrorBoundary>} />
            <Route path="surveys" element={<ErrorBoundary><SurveysPage /></ErrorBoundary>} />
            <Route path="users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
            <Route path="reports" element={<ErrorBoundary><ReportsListPage /></ErrorBoundary>} />
            <Route path="reports/:id" element={<ErrorBoundary><SurveyReportPage /></ErrorBoundary>} />
          </Route>

          <Route path="/user/surveys" element={
            <RequireAuth role="User"><ErrorBoundary><UserSurveysListPage /></ErrorBoundary></RequireAuth>
          } />
          <Route path="/user/surveys/:id" element={
            <RequireAuth role="User"><ErrorBoundary><FillSurveyPage /></ErrorBoundary></RequireAuth>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}