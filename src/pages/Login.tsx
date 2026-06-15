import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithEmail } from '../lib/firebase';
import { useAuthState } from '../hooks/useAuthState';

export function LoginPage() {
  const { user, loading } = useAuthState();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/app/dashboard');
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoggingIn(true);
    try {
      await loginWithEmail(email, password, isSignUp);
    } catch (err) {
      // Error is handled in firebase.ts
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-system-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-system-accent/30">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link to="/" className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl flex items-center justify-center mb-6 shadow-sm hover:opacity-90 transition-opacity overflow-hidden outline outline-1 outline-system-border bg-white">
          <img src="https://fzugmubaqmfjuxdvfnur.supabase.co/storage/v1/object/public/products/1000005269-removebg-preview.png" alt="Livestock AirSense Logo" className="w-full h-full object-contain p-2" />
        </Link>
        <h2 className="text-center text-3xl font-bold tracking-tight text-system-text">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-system-muted">
          Or <Link to="/" className="text-system-accent hover:underline">return to the home page</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-system-panel py-8 px-4 shadow-sm border border-system-border sm:rounded-xl sm:px-10">
          
          <div className="flex justify-center border-b border-system-border mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${!isSignUp ? 'border-system-accent text-system-text' : 'border-transparent text-system-muted hover:text-system-text'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${isSignUp ? 'border-system-accent text-system-text' : 'border-transparent text-system-muted hover:text-system-text'}`}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleEmailAuth}>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-system-text">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="block w-full appearance-none rounded-md border border-system-border px-3 py-2 placeholder-system-muted shadow-sm focus:border-system-accent focus:outline-none focus:ring-1 focus:ring-system-accent sm:text-sm bg-system-bg text-system-text"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-system-text">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full appearance-none rounded-md border border-system-border px-3 py-2 placeholder-system-muted shadow-sm focus:border-system-accent focus:outline-none focus:ring-1 focus:ring-system-accent sm:text-sm bg-system-bg text-system-text"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-system-border text-system-accent focus:ring-system-accent bg-system-bg"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-system-muted">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-system-accent hover:underline">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoggingIn || loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-system-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-system-accent focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {isLoggingIn ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-system-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-system-panel px-2 text-system-muted">Or continue with</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn || loading}
                className="flex w-full justify-center items-center gap-2 rounded-md border border-system-border bg-system-panel px-4 py-2 text-sm font-medium text-system-text shadow-sm hover:bg-system-bg focus:outline-none focus:ring-2 focus:ring-system-accent focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
