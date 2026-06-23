import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
      <div className="h-screen w-screen flex items-center justify-center bg-system-bg">
        <AirLoading />
      </div>
    );
  }

  const uid = user?.uid || 'guest';

  return (
    <AppContextProvider uid={uid}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/app" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AppContextProvider>
  );
}
