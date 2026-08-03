import { useEffect, useRef, useState } from "react";

import { ensureCrazyGamesSdkInitialized } from "../../platformAuth/embedSources/crazyGamesSdk";
import { crazyGamesBannerProvider } from "./providers/crazyGamesBannerProvider";
import { devMockBannerProvider } from "./providers/devMockBannerProvider";
import {
  getPortalAdPhase,
  shouldShowSideBanners,
  subscribePortalAdPhase,
  type PortalAdPhase,
} from "./portalAdPhase";

const PORTAL_BANNER_MIN_VIEW_MS = 5000;

/**
 * Side banners off for now: CrazyGames responsive-banner iframes spam
 * `postMessage(..., "about:srcdoc")` errors and keep RAF/interval heartbeats alive.
 * Flip back to true when CG inventory is stable.
 */
const PORTAL_SIDE_BANNERS_ENABLED = false;

type DisplayAdProvider = {
  id: string;
  isSupported: () => boolean;
  mountResponsiveBanner: (containerId: string) => Promise<{ ok: boolean }>;
  clearAll: () => void;
};

const PROVIDERS: DisplayAdProvider[] = [crazyGamesBannerProvider, devMockBannerProvider];

function resolveDisplayProvider(): DisplayAdProvider | null {
  if (!PORTAL_SIDE_BANNERS_ENABLED) return null;
  return PROVIDERS.find((p) => p.isSupported()) ?? null;
}

export function usePortalSideBannerSlots(active: boolean) {
  const leftId = useRef(`portal-gutter-left-${Math.random().toString(36).slice(2)}`).current;
  const rightId = useRef(`portal-gutter-right-${Math.random().toString(36).slice(2)}`).current;
  const [phase, setPhase] = useState<PortalAdPhase>(() => getPortalAdPhase());
  const [sdkReady, setSdkReady] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => subscribePortalAdPhase(setPhase), []);

  useEffect(() => {
    if (!PORTAL_SIDE_BANNERS_ENABLED) {
      crazyGamesBannerProvider.clearAll();
      return;
    }
    if (!active) return;
    let cancelled = false;
    let attempts = 0;
    const tryReady = () => {
      if (cancelled) return;
      void ensureCrazyGamesSdkInitialized().then((ok) => {
        if (cancelled) return;
        if (ok || attempts >= 40) {
          setSdkReady(true);
          return;
        }
        // Script may still be injecting via EmbedAuthBridge — retry briefly.
        attempts += 1;
        window.setTimeout(tryReady, 100);
      });
    };
    tryReady();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !sdkReady) return;
    const provider = resolveDisplayProvider();
    if (!provider) return;

    const show = shouldShowSideBanners(phase);
    if (!show) {
      provider.clearAll();
      mountedRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      if (mountedRef.current) return;
      const leftEl = document.getElementById(leftId);
      const rightEl = document.getElementById(rightId);
      // CrazyGames requires non-zero container size; skip hidden mobile gutters.
      const canMount = (el: HTMLElement | null) =>
        Boolean(el && el.clientWidth >= 120 && el.clientHeight >= 100);
      if (!canMount(leftEl) && !canMount(rightEl)) return;
      mountedRef.current = true;
      if (canMount(leftEl)) void provider.mountResponsiveBanner(leftId);
      if (canMount(rightEl)) void provider.mountResponsiveBanner(rightId);
    }, PORTAL_BANNER_MIN_VIEW_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, sdkReady, phase, leftId, rightId]);

  useEffect(() => {
    return () => {
      resolveDisplayProvider()?.clearAll();
    };
  }, []);

  return {
    leftId,
    rightId,
    phase,
    hasProvider:
      PORTAL_SIDE_BANNERS_ENABLED && sdkReady && resolveDisplayProvider() != null,
  };
}

export function PortalSideBannerSlot({ containerId, label }: { containerId: string; label: string }) {
  return (
    <div id={containerId} className="portal-display-ad-slot portal-display-ad-slot--live" aria-hidden>
      {label}
    </div>
  );
}
