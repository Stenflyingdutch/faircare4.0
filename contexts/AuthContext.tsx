import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/services/familyService';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string | null, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  completePasswordSetup: (email: string, newPassword: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildFallbackPassword(email: string) {
  return `FairCare-${email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-2026!`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      register: async (email: string, password: string | null, displayName: string) => {
        const usablePassword = password ?? buildFallbackPassword(email);
        const credential = await createUserWithEmailAndPassword(auth, email, usablePassword);
        await createUserProfile({
          uid: credential.user.uid,
          email: credential.user.email ?? email,
          displayName,
        });
      },
      login: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      completePasswordSetup: async (email: string, newPassword: string, displayName = 'Nutzer') => {
        const cleanEmail = email.trim();
        const fallbackPassword = buildFallbackPassword(cleanEmail);

        try {
          const credential = await signInWithEmailAndPassword(auth, cleanEmail, fallbackPassword);
          await updatePassword(credential.user, newPassword);
          await createUserProfile({
            uid: credential.user.uid,
            email: credential.user.email ?? cleanEmail,
            displayName,
          });
          return;
        } catch {
          // Falls es noch kein Konto mit Fallback-Passwort gibt, versuche normales Login oder neue Registrierung.
        }

        try {
          await signInWithEmailAndPassword(auth, cleanEmail, newPassword);
          return;
        } catch {
          const credential = await createUserWithEmailAndPassword(auth, cleanEmail, newPassword);
          await createUserProfile({
            uid: credential.user.uid,
            email: credential.user.email ?? cleanEmail,
            displayName,
          });
        }
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  }
  return context;
}
