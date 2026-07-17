import { api } from "@/convex/sso/convex/_generated/api";
import { useConvex } from "convex/react";
import { useCallback, useState } from "react";

import { looksLikePlatformJwt } from "host/service/platformAuth/platformAccessToken";
import { useUserManager, type User } from "host/service/UserManager";

import {
  type WebSignInStaffGate,
  webSignInErrorMessage,
} from "./webSignInHelpers";

type UseWebSignInOptions = {
  staffGate?: WebSignInStaffGate;
  partnerId?: number;
  /** When set, skip UserManager.authComplete (e.g. SSO modal). */
  onSuccess?: (user: User) => void;
};

type SignInWebAccountResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function useWebSignIn(options: UseWebSignInOptions = {}) {
  const { staffGate = "none", partnerId, onSuccess } = options;
  const convex = useConvex();
  const { authComplete } = useUserManager();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (accountId: string, password: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = (await convex.action(api.service.auth.webConsoleAuth.signInWebAccount, {
          accountId: accountId.trim(),
          password,
          staffGate,
          ...(partnerId !== undefined ? { partnerId } : {}),
        })) as SignInWebAccountResult;
        // Expected auth failures return `{ ok: false }` (no Convex Server Error log).
        if (!res?.ok) {
          setError(webSignInErrorMessage(res?.error ?? "unknown_error"));
          return false;
        }
        const user = res.user;
        if (user?.uid && looksLikePlatformJwt(user.platformAccessToken)) {
          // Stamp which console issued the session (cross-tab staff gate checks).
          const session: User = {
            ...user,
            ...(staffGate !== "none" ? { staffGate } : {}),
          };
          if (onSuccess) {
            onSuccess(session);
          } else {
            authComplete(session, 1);
          }
          return true;
        }
        setError("登录失败，请确认 SSO Convex 已启动。");
        return false;
      } catch (e) {
        setError(webSignInErrorMessage(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [convex, authComplete, onSuccess, partnerId, staffGate]
  );

  return { signIn, busy, error, clearError: () => setError(null) };
}
