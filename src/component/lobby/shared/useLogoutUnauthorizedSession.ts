import { useEffect, useRef } from "react";

import {
  isStaffWebSignInContext,
  resolveWebSignInFromLocation,
} from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { useUserManager } from "host/service/UserManager";

/**
 * Staff consoles (`/platform/admin`, `/partner/admin`, `/partner/operation`):
 * - Session stamped for a different staffGate → forceReauth
 * - Wrong membership for this console → forceReauth
 * - Not authenticated → open SSO
 */
export function useLogoutUnauthorizedSession(unauthorized: boolean) {
  const { forceReauth, askAuth, authReady, isAuthenticated, user } = useUserManager();
  const handledRef = useRef(false);

  const pageGate = resolveWebSignInFromLocation().staffGate;
  const sessionGate = user?.staffGate;
  const gateMismatch = Boolean(
    isStaffWebSignInContext() &&
      isAuthenticated &&
      sessionGate &&
      sessionGate !== "none" &&
      sessionGate !== pageGate
  );

  const mustReauth = unauthorized || gateMismatch;

  useEffect(() => {
    if (!mustReauth) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;
    forceReauth();
  }, [mustReauth, forceReauth]);

  useEffect(() => {
    if (!authReady || isAuthenticated) return;
    if (user?.authReq) return;
    askAuth({});
  }, [authReady, isAuthenticated, askAuth, user?.authReq]);
}
