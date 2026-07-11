import { useEffect, useRef, useState } from "react";

import { crazyGamesBannerProvider } from "./providers/crazyGamesBannerProvider";
import { devMockBannerProvider } from "./providers/devMockBannerProvider";
import {
  getPortalAdPhase,
  shouldShowSideBanners,
  subscribePortalAdPhase,
  type PortalAdPhase,
} from "./portalAdPhase";

const PORTAL_BANNER_MIN_VIEW_MS = 5000;

type DisplayAdProvider = {
  id: string;
  isSupported: () => boolean;
  mountResponsiveBanner: (containerId: string) => Promise<{ ok: boolean }>;
  clearAll: () => void;
};

const PROVIDERS: DisplayAdProvider[] = [crazyGamesBannerProvider, devMockBannerProvider];

function resolveDisplayProvider(): DisplayAdProvider | null {
  return PROVIDERS.find((p) => p.isSupported()) ?? null;
}

export function usePortalSideBannerSlots(active: boolean) {
  const leftId = useRef(`portal-gutter-left-${Math.random().toString(36).slice(2)}`).current;
  const rightId = useRef(`portal-gutter-right-${Math.random().toString(36).slice(2)}`).current;
  const [phase, setPhase] = useState<PortalAdPhase>(() => getPortalAdPhase());
  const mountedRef = useRef(false);

  useEffect(() => subscribePortalAdPhase(setPhase), []);

  useEffect(() => {
    if (!active) return;
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
      mountedRef.current = true;
      void provider.mountResponsiveBanner(leftId);
      void provider.mountResponsiveBanner(rightId);
    }, PORTAL_BANNER_MIN_VIEW_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, phase, leftId, rightId]);

  useEffect(() => {
    return () => {
      resolveDisplayProvider()?.clearAll();
    };
  }, []);

  return { leftId, rightId, phase, hasProvider: resolveDisplayProvider() != null };
}

export function PortalSideBannerSlot({ containerId, label }: { containerId: string; label: string }) {
  return (
    <div id={containerId} className="portal-display-ad-slot portal-display-ad-slot--live" aria-hidden>
      {label}
    </div>
  );
}
