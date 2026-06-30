
import { useConvex } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/convex/sso/convex/_generated/api";
import { ModalItem } from "./ModalManager";
import { PageItem } from "./PageManager";
import { usePlatformAuth } from "./platformAuth/PlatformAuthProvider";
import { isPlatformAuthed } from "./platformAuth/platformAccessToken";
import {
  clearStoredUser,
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
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<IUserContext>({
  user: null,
  authReady: false,
  askAuth: () => {},
  cancelAuth: () => {},
  logout: async () => {},
  authComplete: () => null,
  isAuthenticated: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const convex = useConvex();
  const { applyPlatformSession, clearPlatformSession } = usePlatformAuth();

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
          authComplete(restored, 1);
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

  const isAuthenticated = authReady && isPlatformAuthed(user);

  const value = { user, authReady, authComplete, logout, askAuth, cancelAuth, isAuthenticated };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserManager = () => useContext(UserContext);
export default UserProvider;
