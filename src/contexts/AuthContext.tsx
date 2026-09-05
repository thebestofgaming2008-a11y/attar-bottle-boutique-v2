import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { api } from "../../convex/_generated/api";
import { readPreference, removePreference, writePreference } from "../lib/safeStorage";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_currency: string | null;
  marketing_consent: boolean | null;
}

export interface User {
  id: string;
  email: string | null;
  name?: string | null;
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const ensureCurrentProfile = useMutation(api.users.ensureCurrentProfile);
  const currentUser = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const user = currentUser ?? null;
  const profile = (useQuery(api.users.currentProfile, isAuthenticated ? {} : "skip") ??
    null) as Profile | null;
  const loading = isLoading || (isAuthenticated && currentUser === undefined);
  const isAdmin = Boolean(user?.isAdmin);
  const ensuredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || ensuredUserRef.current === user.id) return;
    ensuredUserRef.current = user.id;
    const pendingName = readPreference("badr_pending_full_name") ?? undefined;
    void ensureCurrentProfile({ fullName: pendingName?.trim() || undefined })
      .then(() => {
        removePreference("badr_pending_full_name");
      })
      .catch(() => {
        ensuredUserRef.current = null;
      });
  }, [ensureCurrentProfile, isAuthenticated, user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await convexSignIn("password", {
          email: email.trim().toLowerCase(),
          password,
          flow: "signIn",
        });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error("Unable to sign in.") };
      }
    },
    [convexSignIn],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const pendingName = fullName?.trim();
      try {
        if (pendingName) writePreference("badr_pending_full_name", pendingName);
        await convexSignIn("password", {
          email: email.trim().toLowerCase(),
          password,
          flow: "signUp",
        });
        return { error: null };
      } catch (err) {
        if (pendingName) removePreference("badr_pending_full_name");
        return { error: err instanceof Error ? err : new Error("Unable to create account.") };
      }
    },
    [convexSignIn],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      try {
        await convexSignIn("password", {
          email: email.trim().toLowerCase(),
          flow: "reset",
        });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error("Unable to send reset code.") };
      }
    },
    [convexSignIn],
  );

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      try {
        await convexSignIn("password", {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
          flow: "reset-verification",
        });
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error("Unable to reset password.") };
      }
    },
    [convexSignIn],
  );

  const signOut = useCallback(async () => {
    await convexSignOut();
  }, [convexSignOut]);

  const refreshProfile = useCallback(async () => {}, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isAdmin,
      loading,
      signIn,
      signUp,
      requestPasswordReset,
      resetPassword,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      isAdmin,
      loading,
      signIn,
      signUp,
      requestPasswordReset,
      resetPassword,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
