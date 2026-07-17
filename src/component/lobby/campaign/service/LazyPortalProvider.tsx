import React, { Suspense, lazy, type ReactNode } from "react";

import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";

const PortalProviderLazy = lazy(() =>
  import("../../portal/service/usePortalManager").then((mod) => ({
    default: mod.PortalProvider,
  }))
);

type LazyPortalProviderProps = {
  gameType: RegisteredPartnerGameType | null;
  children: ReactNode;
  fallback?: ReactNode;
};

export const LazyPortalProvider: React.FC<LazyPortalProviderProps> = ({
  gameType,
  children,
  fallback = null,
}) => (
  <Suspense fallback={fallback}>
    <PortalProviderLazy gameType={gameType}>{children}</PortalProviderLazy>
  </Suspense>
);
