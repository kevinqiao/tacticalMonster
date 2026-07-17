import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useConvex } from "convex/react";

import { api } from "@/convex/sso/convex/_generated/api";
import { EMBED_AUTH_CHANNEL_CID } from "@/convex/sso/convex/service/auth/authChannelCatalog";
import type { EmbedAuthMethod } from "@/convex/sso/convex/service/embed/embedAuthConstants";

import type { User } from "../UserManager";
import {
  bindPlatformAuthToClients,
  clearPlatformAuthOnClients,
  registerConvexAuthClient,
  syncPlatformAuthTokenToClients,
  type ConvexAuthCapable,
} from "./convexAuthRegistry";
import { looksLikePlatformJwt } from "./platformAccessToken";
import {
  mergePlatformAccess,
  platformTokenFromUser,
  readStoredUser,
  writeStoredUser,
} from "./platformSessionStorage";

type PlatformAuthContextValue = {
  platformReady: boolean;
  getAccessToken: () => Promise<string | null>;
  bootstrapFromPartner: (
    pid: number,
    partnerToken: string,
    opts?: { partnerSlug?: string; method?: EmbedAuthMethod }
  ) => Promise<User | null>;
  applyPlatformSession: (user: User) => void;
  clearPlatformSession: () => void;
  registerConvexClient: typeof registerConvexAuthClient;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const convex = useConvex();
  const tokenRef = useRef<string | null>(null);
  const [platformReady, setPlatformReady] = useState(false);

  const applyToken = useCallback((token: string | null) => {
    const valid = looksLikePlatformJwt(token) ? token : null;
    tokenRef.current = valid;
    if (valid) {
      syncPlatformAuthTokenToClients(valid);
      bindPlatformAuthToClients(async () => tokenRef.current);
      setPlatformReady(true);
    } else {
      syncPlatformAuthTokenToClients(null);
      clearPlatformAuthOnClients();
      setPlatformReady(false);
    }
  }, []);

  const getAccessToken = useCallback(async () => {
    return tokenRef.current;
  }, []);

  const applyPlatformSession = useCallback(
    (user: User) => {
      applyToken(platformTokenFromUser(user));
    },
    [applyToken]
  );

  const clearPlatformSession = useCallback(() => {
    tokenRef.current = null;
    clearPlatformAuthOnClients();
    setPlatformReady(false);
  }, []);

  const bootstrapFromPartner = useCallback(
    async (pid: number, partnerToken: string, opts?: { partnerSlug?: string; method?: EmbedAuthMethod }) => {
      const session = (await convex.action(api.service.AuthManager.authenticate, {
        cid: EMBED_AUTH_CHANNEL_CID,
        partner: pid,
        data: {
          credential: partnerToken,
          method: opts?.method ?? "jwt_local",
          ...(opts?.partnerSlug ? { partnerSlug: opts.partnerSlug } : {}),
        },
      })) as User | null;
      if (!session?.uid || !session.platformAccessToken) return null;

      writeStoredUser(session);
      applyToken(platformTokenFromUser(session));
      return session;
    },
    [applyToken, convex]
  );

  useEffect(() => {
    registerConvexAuthClient(convex as ConvexAuthCapable);

    const stored = readStoredUser();
    const token = platformTokenFromUser(stored);
    if (token) {
      applyToken(token);
    } else {
      tokenRef.current = null;
      clearPlatformAuthOnClients();
      setPlatformReady(false);
    }
  }, [applyToken, convex]);

  const value = useMemo(
    () => ({
      platformReady,
      getAccessToken,
      bootstrapFromPartner,
      applyPlatformSession,
      clearPlatformSession,
      registerConvexClient: registerConvexAuthClient,
    }),
    [
      platformReady,
      getAccessToken,
      bootstrapFromPartner,
      applyPlatformSession,
      clearPlatformSession,
    ]
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
};

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  }
  return ctx;
}

/** Attach platform JWT fields after authComplete / partner bootstrap. */
export function attachPlatformAccessToUser(user: User, patch: {
  platformAccessToken: string;
  platformAccessExpire: number;
}): User {
  return mergePlatformAccess(user, patch);
}
