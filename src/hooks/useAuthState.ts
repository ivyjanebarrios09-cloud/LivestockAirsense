import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth, recordUserInFirestore } from '../lib/firebase';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle any redirect results (mostly for catching errors)
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect auth error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        recordUserInFirestore(u);
      }
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
