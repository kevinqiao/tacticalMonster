import { useConvex } from "convex/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/convex/sso/convex/_generated/api";
import { isStaffWebSignInContext } from "@/component/lobby/shared/resolveWebSignInFromLocation";
import type { WebSignInStaffGate } from "@/component/lobby/shared/webSignInHelpers";
import { ModalItem } from "./ModalManager";
import { PageItem } from "./PageManager";
import { usePlatformAuth } from "./platformAuth/PlatformAuthProvider";
import { isPlatformAuthed } from "./platformAuth/platformAccessToken";
import {
  clearStoredUser,
  parseStoredUserJson,
  PLATFORM_USER_STORAGE_KEY,
  readStoredUser,
  writeStoredUser,
} from "./platformAuth/platformSessionStorage";
import { signOutClerkSession } from "./clerk/clerkSessionBridge";

export interface User {
  uid?: string;
  partner?: number;
  /** RS256 JWT for Convex setAuth — sole client session credential. */
  platformAccessToken?: string;
  platformAccessExpire?: number;
  /**
   * Which staff console issued this session (`platform` / `partner` / `merchant`).
   * Used to force re-auth when opening a different staff console in another tab.
   */
  staffGate?: WebSignInStaffGate;
  lastUpdate?: number;
  name?: string;
  email?: string;
  phone?: string;
  data?: { [k: string]: any };
  assets?: { [k: string]: number };
  authReq?: { page?: PageItem; modal?: ModalItem } | null;
}

export enum AppSessionStatus {
  TO_BE_SIGNED_IN = 0,
  SIGNING_IN = 1,
  SIGNED_IN = 2,
  TO_BE_SIGNED_OUT = 3,
  SIGNING_OUT = 4,
  SIGNED_OUT = 5,
}

interface IUserContext {
  user: User | null;
  /** Session restore from storage finished — safe to show SSO / embed gate. */
  authReady: boolean;
  askAuth: ({ page, modal }: { page?: PageItem; modal?: ModalItem }) => void;
  cancelAuth: () => void;
  authComplete: (user: User, persist: number) => void;
  /** Clear this tab's memory + Convex auth only — does not touch localStorage. */
  dropLocalSession: () => void;
  /**
   * Drop local session and open SSO in one state update (staff re-auth).
   * Avoids authLevel 2→1 flicker that can cancel playOpen.
   */
  forceReauth: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<IUserContext>({
  user: null,
  authReady: false,
  askAuth: () => {},
  cancelAuth: () => {},
  dropLocalSession: () => {},
  forceReauth: () => {},
  logout: async () => {},
  authComplete: () => null,
  isAuthenticated: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef<User | null>(null);
  const convex = useConvex();
  const { applyPlatformSession, clearPlatformSession } = usePlatformAuth();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const askAuth = useCallback(({ page, modal }: { page?: PageItem; modal?: ModalItem }) => {
    setUser((prev) => {
      const base = prev ?? {};
      if (base.authReq) return base;
      return { ...base, authReq: { page, modal } };
    });
  }, []);

  const cancelAuth = useCallback(() => {
    setUser((prev) => {
      if (prev?.authReq) {
        return { ...prev, authReq: null };
      }
      return prev;
    });
  }, []);

  const authComplete = useCallback(
    (u: User, persist: number) => {
      const session = {
        ...u,
        authReq: null,
      };
      if (persist) {
        writeStoredUser(session);
      }
      if (u.platformAccessToken) {
        applyPlatformSession(session);
      }
      setUser((prev) => ({ ...prev, ...session }));
    },
    [applyPlatformSession]
  );

  /** Drop this tab's in-memory session only — never clear localStorage (other tabs own it). */
  const dropLocalSession = useCallback(() => {
    void signOutClerkSession();
    clearPlatformSession();
    setUser({});
  }, [clearPlatformSession]);

  /** Staff consoles: exit locally and open SSO without clearing other tabs' storage. */
  const forceReauth = useCallback(() => {
    void signOutClerkSession();
    clearPlatformSession();
    setUser({ authReq: {} });
  }, [clearPlatformSession]);

  const logout = useCallback(async () => {
    await signOutClerkSession();
    if (user?.platformAccessToken) {
      try {
        await convex.action(api.service.AuthManager.signOut, {
          platformAccessToken: user.platformAccessToken,
        });
      } catch (e) {
        console.warn("[logout]", e);
      }
    }
    clearStoredUser();
    clearPlatformSession();
    setUser({});
  }, [user, convex, clearPlatformSession]);

  useEffect(() => {
    const restore = async () => {
      const stored = readStoredUser();
      if (!stored?.platformAccessToken) {
        setUser({});
        setAuthReady(true);
        return;
      }
      applyPlatformSession(stored);
      try {
        const restored = (await convex.action(api.service.auth.platformAuth.restorePlatformSession, {
          platformAccessToken: stored.platformAccessToken,
        })) as User | null;
        if (restored?.uid && restored.platformAccessToken) {
          // Preserve client-only staffGate stamped at web console login.
          authComplete(
            {
              ...restored,
              ...(stored.staffGate ? { staffGate: stored.staffGate } : {}),
            },
            1
          );
        } else {
          clearStoredUser();
          clearPlatformSession();
          setUser({});
        }
      } catch (err) {
        console.warn("[UserProvider] restore failed", err);
        clearStoredUser();
        clearPlatformSession();
        setUser({});
      } finally {
        setAuthReady(true);
      }
    };
    void restore();
  }, [convex, authComplete, applyPlatformSession, clearPlatformSession]);

  // Cross-tab: another tab changed `user` in localStorage → this tab exits (no toast).
  // Staff consoles: exit + open SSO (forceReauth). Consumer: silent drop only.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PLATFORM_USER_STORAGE_KEY) return;
      if (event.storageArea && event.storageArea !== localStorage) return;

      const prev = userRef.current;
      const hadSession = Boolean(prev?.uid || prev?.platformAccessToken);
      const next = parseStoredUserJson(event.newValue);
      const exit = () => {
        if (isStaffWebSignInContext()) forceReauth();
        else dropLocalSession();
      };

      if (!next?.uid) {
        if (hadSession) exit();
        return;
      }

      // Same account, token refresh elsewhere — stay signed in with new credentials.
      if (
        hadSession &&
        prev?.uid === next.uid &&
        next.platformAccessToken &&
        next.platformAccessToken !== prev.platformAccessToken
      ) {
        applyPlatformSession(next);
        setUser((u) => ({ ...(u ?? {}), ...next, authReq: null }));
        return;
      }

      if (hadSession && prev?.uid !== next.uid) {
        exit();
        return;
      }

      if (
        hadSession &&
        prev?.uid === next.uid &&
        prev?.platformAccessToken === next.platformAccessToken
      ) {
        return;
      }

      // This tab had a session and storage identity changed in any other way → exit.
      if (hadSession) {
        exit();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyPlatformSession, dropLocalSession, forceReauth]);

  const isAuthenticated = authReady && isPlatformAuthed(user);

  const value = {
    user,
    authReady,
    authComplete,
    dropLocalSession,
    forceReauth,
    logout,
    askAuth,
    cancelAuth,
    isAuthenticated,
  };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};


export const useUserManager = () => useContext(UserContext);
export default UserProvider;
