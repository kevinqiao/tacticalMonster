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
        })) as User | null;
        if (res?.uid && looksLikePlatformJwt(res.platformAccessToken)) {
          if (onSuccess) {
            onSuccess(res);
          } else {
            authComplete(res, 1);
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
