import React, { useEffect } from "react";

import {
  PortalSideBannerSlot,
  usePortalSideBannerSlots,
} from "host/service/ads/display/usePortalSideBannerSlots";
import { setPortalAdPhase } from "host/service/ads/display/portalAdPhase";
import { PortalViewportShell } from "host/service/ads/display/PortalViewportShell";

type PortalGame3DViewportProps = {
  children: React.ReactNode;
  pageActive: boolean;
  modalOpen?: boolean;
};

/** Portal 大厅 viewport：PC 侧栏 Banner + 居中游戏 stage。 */
export function PortalGame3DViewport({
  children,
  pageActive,
  modalOpen = false,
}: PortalGame3DViewportProps) {
  const { leftId, rightId, hasProvider } = usePortalSideBannerSlots(pageActive);

  useEffect(() => {
    if (!pageActive) {
      setPortalAdPhase("hidden");
      return;
    }
    setPortalAdPhase(modalOpen ? "modal" : "lobby");
    return () => setPortalAdPhase("hidden");
  }, [pageActive, modalOpen]);

  const leftBanner =
    hasProvider ? <PortalSideBannerSlot containerId={leftId} label="Ad" /> : null;
  const rightBanner =
    hasProvider ? <PortalSideBannerSlot containerId={rightId} label="Ad" /> : null;

  if (!hasProvider) {
    return <>{children}</>;
  }

  return (
    <PortalViewportShell leftBanner={leftBanner} rightBanner={rightBanner}>
      {children}
    </PortalViewportShell>
  );
}
