import React, { Suspense, lazy, type ReactNode } from "react";

import type { RegisteredPortalGameType } from "@/convex/portal/convex/data/portalGameRegistry";

const PortalProviderLazy = lazy(() =>
  import("../../portal/service/usePortalManager").then((mod) => ({
    default: mod.PortalProvider,
  }))
);

type LazyPortalProviderProps = {
  gameType: RegisteredPortalGameType | null;
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
