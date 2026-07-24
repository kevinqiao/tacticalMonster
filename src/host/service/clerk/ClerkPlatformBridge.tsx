import { useAuth, useClerk } from "@clerk/clerk-react";
import React, { useEffect, useRef } from "react";

import { useClerkSignIn } from "@/component/lobby/shared/useClerkSignIn";

import { usePartnerManager } from "../PartnerManager";
import { useUserManager } from "../UserManager";
import {
  sessionPartnerMatchesUrlPartner,
} from "../platformAuth/sessionPartnerMatch";
import { readStoredUser } from "../platformAuth/platformSessionStorage";
import {
  blockClerkAutoExchangeAfterPartnerSwitch,
  clearTransientClerkAutoExchangeSuppress,
  registerClerkSignOut,
  shouldSuppressClerkAutoExchange,
} from "./clerkSessionBridge";
import { isClerkConfigured } from "./clerkEnv";

/** After Clerk sign-in, exchange session token for platform JWT (cid=1). */
const ClerkPlatformBridgeInner: React.FC = () => {
  const clerk = useClerk();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { isAuthenticated, authReady } = useUserManager();
  const { partnerPid, partnerResolveReady } = usePartnerManager();
  const { exchangeSession } = useClerkSignIn({ partnerId: partnerPid });
  const busyRef = useRef(false);

  useEffect(() => {
    // No redirectUrl: partner-mismatch logout must finish clearing storage first.
    return registerClerkSignOut(() => clerk.signOut());
  }, [clerk]);

  useEffect(() => {
    if (!isLoaded) return;
    // Only drop the in-flight sign-out suppress. Partner-switch block must
    // survive so a still-warm Clerk cookie cannot silently mint a new PID JWT.
    if (!isSignedIn) {
      clearTransientClerkAutoExchangeSuppress();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // Wait for session restore — otherwise a cold load of /gc/{key}/… races:
    // isAuthenticated is briefly false while localStorage still has PID-0, and
    // we would mint a JWT for the URL partner before PartnerSessionGuard runs.
    if (!isLoaded || !isSignedIn || isAuthenticated || !partnerResolveReady || !authReady) {
      return;
    }
    if (shouldSuppressClerkAutoExchange()) return;

    const stored = readStoredUser();
    if (stored?.uid && !sessionPartnerMatchesUrlPartner(stored, partnerPid)) {
      blockClerkAutoExchangeAfterPartnerSwitch();
      return;
    }

    const tryExchange = async () => {
      if (busyRef.current || shouldSuppressClerkAutoExchange()) return;
      busyRef.current = true;
      try {
        const token = await getToken();
        if (!token) return;
        if (shouldSuppressClerkAutoExchange()) return;
        await exchangeSession(token);
      } finally {
        busyRef.current = false;
      }
    };

    void tryExchange();
    const id = window.setInterval(() => {
      void tryExchange();
    }, 800);

    return () => window.clearInterval(id);
  }, [
    authReady,
    exchangeSession,
    getToken,
    isAuthenticated,
    isLoaded,
    isSignedIn,
    partnerPid,
    partnerResolveReady,
  ]);

  return null;
};

/** Must render only as a descendant of `ClerkProvider`. */
const ClerkPlatformBridge: React.FC = () => {
  if (!isClerkConfigured()) return null;
  return <ClerkPlatformBridgeInner />;
};

export default ClerkPlatformBridge;
