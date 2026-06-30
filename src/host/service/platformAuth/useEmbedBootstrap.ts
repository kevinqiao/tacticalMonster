import { useCallback, useRef } from "react";

import { useUserManager } from "../UserManager";
import { useEmbedAuthGate } from "./EmbedAuthGateProvider";
import { usePlatformAuth } from "./PlatformAuthProvider";
import type { EmbedCredentialPayload } from "./embedSources/types";

export function useEmbedBootstrap() {
  const { bootstrapFromPartner } = usePlatformAuth();
  const { authComplete } = useUserManager();
  const { markBootstrapping, markFailed, markSucceeded } = useEmbedAuthGate();
  const inflightRef = useRef(false);

  const runBootstrap = useCallback(
    async (payload: EmbedCredentialPayload) => {
      if (inflightRef.current) return;

      inflightRef.current = true;
      markBootstrapping();

      try {
        const session = await bootstrapFromPartner(payload.pid, payload.credential, {
          method: payload.method,
          ...(payload.merchantSlug ? { merchantSlug: payload.merchantSlug } : {}),
        });
        if (session) {
          markSucceeded();
          authComplete(session, 1);
        } else {
          markFailed();
        }
      } catch {
        markFailed();
      } finally {
        inflightRef.current = false;
      }
    },
    [authComplete, bootstrapFromPartner, markBootstrapping, markFailed, markSucceeded]
  );

  return { runBootstrap };
}
