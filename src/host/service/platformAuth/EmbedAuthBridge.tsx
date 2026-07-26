import React, { useEffect, useMemo, useRef } from "react";

import { usePartnerManager } from "../PartnerManager";
import { buildEmbedSourceContext } from "./embedAuthGate";
import {
  listEmbedCredentialSources,
  selectEmbedSourcesToListen,
} from "./embedSources/registry";
import { logEmbedSourcesListening } from "./embedSources/embedAuthLog";
import { loadEmbedSdkSpecs, planEmbedSdkLoads } from "./embedSources/sdkLoader";
import type { EmbedSourceContext } from "./embedSources/types";
import { useEmbedBootstrap } from "./useEmbedBootstrap";

function startEmbedSources(
  ctx: EmbedSourceContext,
  runBootstrap: ReturnType<typeof useEmbedBootstrap>["runBootstrap"]
) {
  return selectEmbedSourcesToListen(ctx).map((source) =>
    source.start(ctx, (payload) => void runBootstrap(payload))
  );
}

/** Runs all active embed credential sources and exchanges credentials for platform JWT. */
export const EmbedAuthBridge: React.FC = () => {
  const {
    partner,
    partnerPid,
    partnerResolveReady,
    campaignPartnerSlug,
    portalPartnerSlug,
    isFirstPartyPortal,
  } = usePartnerManager();
  const { runBootstrap } = useEmbedBootstrap();
  const cleanupsRef = useRef<Array<() => void>>([]);

  const ctx = useMemo<EmbedSourceContext>(
    () =>
      buildEmbedSourceContext({
        partnerPid,
        partner,
        partnerResolveReady,
        campaignPartnerSlug,
        portalPartnerSlug,
        isFirstPartyPortal,
      }),
    [
      campaignPartnerSlug,
      isFirstPartyPortal,
      partner,
      partnerPid,
      partnerResolveReady,
      portalPartnerSlug,
    ]
  );

  useEffect(() => {
    cleanupsRef.current.forEach((cleanup) => cleanup());
    cleanupsRef.current = [];

    if (!partnerResolveReady) return;
    if (isFirstPartyPortal) return;

    let cancelled = false;
    const sources = listEmbedCredentialSources();
    const specs = planEmbedSdkLoads(sources, ctx);

    const attachSources = () => {
      if (cancelled) return;
      const selected = selectEmbedSourcesToListen(ctx);
      logEmbedSourcesListening(
        selected.map((s) => s.id),
        ctx.partnerPid
      );
      cleanupsRef.current = startEmbedSources(ctx, runBootstrap);
    };

    if (specs.length === 0) {
      attachSources();
      return () => {
        cancelled = true;
        cleanupsRef.current.forEach((cleanup) => cleanup());
        cleanupsRef.current = [];
      };
    }

    void (async () => {
      try {
        await loadEmbedSdkSpecs(specs);
      } catch (error) {
        console.warn("[EmbedAuthBridge] sdk preload failed", error);
      }
      attachSources();
    })();

    return () => {
      cancelled = true;
      cleanupsRef.current.forEach((cleanup) => cleanup());
      cleanupsRef.current = [];
    };
  }, [ctx, isFirstPartyPortal, partnerResolveReady, runBootstrap]);

  return null;
};

export default EmbedAuthBridge;
