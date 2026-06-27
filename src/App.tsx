import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppContextProvider } from './hooks/useAppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/History';
import { AnalyticsPage } from './pages/Analytics';
import { AlertsPage } from './pages/Alerts';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { LandingPage } from './pages/Landing';
import { LoginPage } from './pages/Login';
import { useAuthState } from './hooks/useAuthState';

import { AirLoading } from './components/AirLoading';

export default function App() {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-system-bg text-system-text">
        <AirLoading />
      </div>
    );
  }

  const uid = user?.uid || 'guest';

  return (
    <AppContextProvider uid={uid}>
      <Toaster position="top-right" richColors closeButton theme="dark" />
      <Router>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/app/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage />} />
          
          <Route path="/app" element={user ? <Layout /> : <Navigate to="/login" replace />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to={user ? "/app/dashboard" : "/"} replace />} />
        </Routes>
      </Router>
    </AppContextProvider>
  );
}
