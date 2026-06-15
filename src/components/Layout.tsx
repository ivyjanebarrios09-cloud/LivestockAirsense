import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useAuthState } from '../hooks/useAuthState';

export function Layout() {
  const { user, loading } = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex bg-system-bg h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-system-accent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex bg-system-bg h-screen w-full overflow-hidden text-system-text font-sans selection:bg-system-accent/30">
      <Sidebar />
      
      <div className="flex-1 flex flex-col w-full min-w-0 pb-16 md:pb-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto w-full relative">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
