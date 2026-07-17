import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { isStaffWebSignInContext } from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { isPlatformAuthed } from "./platformAccessToken";
import { usePartnerManager } from "../PartnerManager";
import { useUserManager } from "../UserManager";
import {
  anyEmbedCredentialSourceActive,
  anyEmbedCredentialSourceEligible,
  listEmbedCredentialSources,
} from "./embedSources/registry";
import { loadSdksForSources } from "./embedSources/sdkLoader";
import {
  deferClerkForEmbedGate,
  EMBED_AUTH_GRACE_MS,
  buildEmbedSourceContext,
  partnerEmbedChannelEnabled,
  shouldAttemptEmbedGate,
  type EmbedAuthGatePhase,
} from "./embedAuthGate";

type EmbedAuthGateContextValue = {
  phase: EmbedAuthGatePhase;
  deferClerk: boolean;
  markBootstrapping: () => void;
  markSucceeded: () => void;
  markFailed: () => void;
};

const EmbedAuthGateContext = createContext<EmbedAuthGateContextValue | null>(null);

export const EmbedAuthGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    partner,
    partnerPid,
    partnerResolveReady,
    campaignPartnerSlug,
    portalPartnerKey,
    isFirstPartyPortal,
  } = usePartnerManager();
  const { user, authReady } = useUserManager();
  const [phase, setPhase] = useState<EmbedAuthGatePhase>("pending");
  const graceTimerRef = useRef<number | null>(null);

  const clearGraceTimer = useCallback(() => {
    if (graceTimerRef.current != null) {
      window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  const markBootstrapping = useCallback(() => {
    clearGraceTimer();
    setPhase("bootstrapping");
  }, [clearGraceTimer]);

  const markSucceeded = useCallback(() => {
    clearGraceTimer();
    setPhase("succeeded");
  }, [clearGraceTimer]);

  const markFailed = useCallback(() => {
    clearGraceTimer();
    setPhase("failed");
  }, [clearGraceTimer]);

  useEffect(() => {
    clearGraceTimer();
    let cancelled = false;

    // Staff consoles never wait on embed/Clerk handoff — do not block SSO behind partner resolve.
    if (isStaffWebSignInContext()) {
      setPhase("skipped");
      return;
    }

    if (!authReady || !partnerResolveReady) {
      setPhase("pending");
      return;
    }

    if (isPlatformAuthed(user)) {
      setPhase("skipped");
      return;
    }

    if (isFirstPartyPortal && !isPlatformAuthed(user)) {
      setPhase("skipped");
      return;
    }

    if (!partnerEmbedChannelEnabled(partner)) {
      setPhase("skipped");
      return;
    }

    const attempt = shouldAttemptEmbedGate({
      staffConsole: false,
      partnerResolveReady,
      authReady,
      partner,
      alreadyAuthed: isPlatformAuthed(user),
      isFirstPartyPortal,
    });

    if (!attempt) {
      setPhase("skipped");
      return;
    }

    const embedCtx = buildEmbedSourceContext({
      partnerPid,
      partner,
      partnerResolveReady,
      campaignPartnerSlug,
      portalPartnerKey,
      isFirstPartyPortal,
    });

    if (!anyEmbedCredentialSourceEligible(embedCtx)) {
      setPhase("skipped");
      return;
    }

    setPhase("pending");

    void (async () => {
      try {
        await loadSdksForSources(listEmbedCredentialSources(), embedCtx);
      } catch {
        if (!cancelled) setPhase("failed");
        return;
      }
      if (cancelled) return;

      if (!anyEmbedCredentialSourceActive(embedCtx)) {
        setPhase("skipped");
        return;
      }

      setPhase("waiting");
      graceTimerRef.current = window.setTimeout(() => {
        setPhase((prev) => (prev === "waiting" ? "timed_out" : prev));
      }, EMBED_AUTH_GRACE_MS);
    })();

    return () => {
      cancelled = true;
      clearGraceTimer();
    };
  }, [
    authReady,
    campaignPartnerSlug,
    clearGraceTimer,
    isFirstPartyPortal,
    partner,
    partnerPid,
    partnerResolveReady,
    portalPartnerKey,
    user,
  ]);

  useEffect(() => () => clearGraceTimer(), [clearGraceTimer]);

  const deferClerk = deferClerkForEmbedGate(phase);

  const value = useMemo(
    () => ({
      phase,
      deferClerk,
      markBootstrapping,
      markSucceeded,
      markFailed,
    }),
    [deferClerk, markBootstrapping, markFailed, markSucceeded, phase]
  );

  return <EmbedAuthGateContext.Provider value={value}>{children}</EmbedAuthGateContext.Provider>;
};

export function useEmbedAuthGate(): EmbedAuthGateContextValue {
  const ctx = useContext(EmbedAuthGateContext);
  if (!ctx) {
    throw new Error("useEmbedAuthGate must be used within EmbedAuthGateProvider");
  }
  return ctx;
}
