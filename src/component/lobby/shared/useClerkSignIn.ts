import { api } from "@/convex/sso/convex/_generated/api";
import { CLERK_AUTH_CHANNEL_CID } from "@/convex/sso/convex/service/auth/authChannelCatalog";
import { useConvex } from "convex/react";
import { useCallback, useState } from "react";

import { shouldSuppressClerkAutoExchange } from "host/service/clerk/clerkSessionBridge";
import { looksLikePlatformJwt } from "host/service/platformAuth/platformAccessToken";
import { useUserManager, type User } from "host/service/UserManager";

import { clerkSignInErrorMessage } from "./clerkSignInHelpers";

type UseClerkSignInOptions = {
  partnerId: number;
  /** When set, skip UserManager.authComplete (e.g. SSO modal). */
  onSuccess?: (user: User) => void;
  /**
   * When true (default), honor partner-switch / sign-out suppress so silent
   * Clerk→platform minting cannot bypass PartnerSessionGuard.
   * Intentional SSO after askAuth clears the suppress first.
   */
  respectAutoExchangeSuppress?: boolean;
};

export function useClerkSignIn(options: UseClerkSignInOptions) {
  const { partnerId, onSuccess, respectAutoExchangeSuppress = true } = options;
  const convex = useConvex();
  const { authComplete } = useUserManager();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangeSession = useCallback(
    async (sessionToken: string | null) => {
      if (respectAutoExchangeSuppress && shouldSuppressClerkAutoExchange()) {
        return false;
      }
      if (!sessionToken?.trim()) {
        setError(clerkSignInErrorMessage("clerk_session_missing"));
        return false;
      }

      setBusy(true);
      setError(null);
      try {
        const res = (await convex.action(api.service.AuthManager.authenticate, {
          cid: CLERK_AUTH_CHANNEL_CID,
          partner: partnerId,
          data: { sessionToken: sessionToken.trim() },
        })) as User | null;

        if (res?.uid && looksLikePlatformJwt(res.platformAccessToken)) {
          if (onSuccess) {
            onSuccess(res);
          } else {
            authComplete(res, 1);
          }
          return true;
        }

        setError(clerkSignInErrorMessage("auth_failed"));
        return false;
      } catch (e) {
        setError(clerkSignInErrorMessage(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [authComplete, convex, onSuccess, partnerId, respectAutoExchangeSuppress]
  );

  return { exchangeSession, busy, error, clearError: () => setError(null) };
}
