import React, { useEffect, useMemo, useRef } from "react";

import { usePartnerManager } from "../PartnerManager";
import { buildEmbedSourceContext } from "./embedAuthGate";
import { listEmbedCredentialSources } from "./embedSources/registry";
import { collectEmbedSdkSpecs, loadSdksForSources } from "./embedSources/sdkLoader";
import type { EmbedSourceContext } from "./embedSources/types";
import { useEmbedBootstrap } from "./useEmbedBootstrap";

function startEmbedSources(
  sources: ReturnType<typeof listEmbedCredentialSources>,
  ctx: EmbedSourceContext,
  runBootstrap: ReturnType<typeof useEmbedBootstrap>["runBootstrap"]
) {
  return sources
    .filter((source) => source.shouldListen(ctx))
    .map((source) => source.start(ctx, (payload) => void runBootstrap(payload)));
}

/** Runs all active embed credential sources and exchanges credentials for platform JWT. */
export const EmbedAuthBridge: React.FC = () => {
  const {
    partner,
    partnerPid,
    partnerResolveReady,
    campaignMerchantSlug,
    portalPartnerKey,
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
        campaignMerchantSlug,
        portalPartnerKey,
        isFirstPartyPortal,
      }),
    [
      campaignMerchantSlug,
      isFirstPartyPortal,
      partner,
      partnerPid,
      partnerResolveReady,
      portalPartnerKey,
    ]
  );

  useEffect(() => {
    cleanupsRef.current.forEach((cleanup) => cleanup());
    cleanupsRef.current = [];

    if (!partnerResolveReady) return;
    if (isFirstPartyPortal) return;

    let cancelled = false;
    const sources = listEmbedCredentialSources();
    const specs = collectEmbedSdkSpecs(sources, ctx);

    const attachSources = () => {
      if (cancelled) return;
      cleanupsRef.current = startEmbedSources(sources, ctx, runBootstrap);
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
        await loadSdksForSources(sources, ctx);
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
