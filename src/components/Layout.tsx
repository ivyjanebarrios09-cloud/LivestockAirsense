import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuthState } from '../hooks/useAuthState';
import { useAppContext } from '../hooks/useAppContext';

import { AirLoading } from './AirLoading';

export function Layout() {
  const { user, loading } = useAuthState();
  const { uid } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we are not in guest mode
    if (!loading && !user && uid !== 'guest') {
      navigate('/login');
    }
  }, [user, loading, navigate, uid]);

  if (loading) {
    return (
      <div className="flex bg-system-bg h-screen w-full items-center justify-center">
        <AirLoading />
      </div>
    );
  }

  if (!user && uid !== 'guest') {
    return null;
  }

  return (
    <div className="flex bg-system-bg h-screen w-full overflow-hidden text-system-text font-sans selection:bg-system-accent/30">
      <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto w-full relative pb-28">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
