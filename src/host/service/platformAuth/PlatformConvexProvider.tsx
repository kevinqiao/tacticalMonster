import React, { useEffect } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { usePlatformAuth } from "./PlatformAuthProvider";

/** ConvexProvider that binds platform JWT via setAuth (Clerk + Convex pattern). */
export const PlatformConvexProvider: React.FC<{
  client: ConvexReactClient;
  children: React.ReactNode;
}> = ({ client, children }) => {
  const { registerConvexClient } = usePlatformAuth();

  useEffect(() => {
    return registerConvexClient(client);
  }, [client, registerConvexClient]);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
};

export default PlatformConvexProvider;
