import { useCallback, useRef } from "react";

import { useUserManager } from "../UserManager";
import { useEmbedAuthGate } from "./EmbedAuthGateProvider";
import { usePlatformAuth } from "./PlatformAuthProvider";
import { logEmbedPlatformExchange } from "./embedSources/embedAuthLog";
import type { EmbedCredentialPayload } from "./embedSources/types";

export function useEmbedBootstrap() {
  const { bootstrapFromPartner } = usePlatformAuth();
  const { authComplete } = useUserManager();
  const { markBootstrapping, markFailed, markSucceeded } = useEmbedAuthGate();
  const inflightRef = useRef(false);

  const runBootstrap = useCallback(
    async (payload: EmbedCredentialPayload) => {
      if (inflightRef.current) {
        logEmbedPlatformExchange(payload.method, payload.pid, "skipped_duplicate", {
          tokenChars: payload.credential.length,
        });
        return;
      }

      inflightRef.current = true;
      markBootstrapping();

      try {
        const session = await bootstrapFromPartner(payload.pid, payload.credential, {
          method: payload.method,
          ...(payload.merchantSlug ? { merchantSlug: payload.merchantSlug } : {}),
        });
        if (session) {
          logEmbedPlatformExchange(payload.method, payload.pid, "success", {
            uid: session.uid,
            tokenChars: payload.credential.length,
          });
          markSucceeded();
          authComplete(session, 1);
        } else {
          logEmbedPlatformExchange(payload.method, payload.pid, "failed", {
            reason: "authenticate_returned_null",
            tokenChars: payload.credential.length,
          });
          markFailed();
        }
      } catch (error) {
        logEmbedPlatformExchange(payload.method, payload.pid, "failed", {
          reason: error instanceof Error ? error.message : "exchange_threw",
          tokenChars: payload.credential.length,
        });
        markFailed();
      } finally {
        inflightRef.current = false;
      }
    },
    [authComplete, bootstrapFromPartner, markBootstrapping, markFailed, markSucceeded]
  );

  return { runBootstrap };
}
