import React, { useEffect, useState } from "react";

import {
  PortalSideBannerSlot,
  usePortalSideBannerSlots,
} from "host/service/ads/display/usePortalSideBannerSlots";
import {
  getPortalAdPhase,
  isPortalPlayFlowPhase,
  setPortalAdPhase,
} from "host/service/ads/display/portalAdPhase";
import { PortalViewportShell } from "host/service/ads/display/PortalViewportShell";
import {
  PORTAL_DESKTOP_MIN_WIDTH_PX,
  isPortalViewportPortrait,
} from "host/service/ads/display/viewportLayout";

type PortalGame3DViewportProps = {
  children: React.ReactNode;
  pageActive: boolean;
  modalOpen?: boolean;
};

function useNeedsSideBannerShell(): boolean {
  const [needsShell, setNeedsShell] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth >= PORTAL_DESKTOP_MIN_WIDTH_PX &&
      !isPortalViewportPortrait(window.innerWidth, window.innerHeight)
    );
  });

  useEffect(() => {
    const update = () => {
      setNeedsShell(
        window.innerWidth >= PORTAL_DESKTOP_MIN_WIDTH_PX &&
          !isPortalViewportPortrait(window.innerWidth, window.innerHeight)
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return needsShell;
}

/** Portal 大厅 viewport：PC 侧栏 Banner + 居中游戏 stage。 */
export function PortalGame3DViewport({
  children,
  pageActive,
  modalOpen = false,
}: PortalGame3DViewportProps) {
  const { leftId, rightId, hasProvider } = usePortalSideBannerSlots(pageActive);
  const needsSideBannerShell = useNeedsSideBannerShell();

  useEffect(() => {
    if (!pageActive) {
      if (!isPortalPlayFlowPhase(getPortalAdPhase())) {
        setPortalAdPhase("hidden");
      }
      return;
    }
    // Play modal / matchmaking / settle own their phases — don't stomp with lobby chrome.
    if (isPortalPlayFlowPhase(getPortalAdPhase())) {
      return;
    }
    setPortalAdPhase(modalOpen ? "modal" : "lobby");
  }, [pageActive, modalOpen]);

  const leftBanner =
    hasProvider ? <PortalSideBannerSlot containerId={leftId} label="Ad" /> : null;
  const rightBanner =
    hasProvider ? <PortalSideBannerSlot containerId={rightId} label="Ad" /> : null;

  // Mobile / portrait: side gutters are unused; the landscape shell letterboxes the lobby
  // into the top of the phone. Skip it so PortalGame3DInner can scale 1440×2560 full-bleed.
  if (!hasProvider || !needsSideBannerShell) {
    return <>{children}</>;
  }

  return (
    <PortalViewportShell leftBanner={leftBanner} rightBanner={rightBanner}>
      {children}
    </PortalViewportShell>
  );
}
