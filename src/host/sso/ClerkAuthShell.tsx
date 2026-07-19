import { ClerkProvider } from "@clerk/clerk-react";
import React, { useCallback, useEffect, useState } from "react";

import ClerkPlatformBridge from "../service/clerk/ClerkPlatformBridge";
import ClerkSsoCallbackHost from "../service/clerk/ClerkSsoCallbackHost";
import { clerkReturnUrl } from "../service/clerk/clerkReturnUrl";
import { getClerkPublishableKey, isClerkConfigured } from "../service/clerk/clerkEnv";
import { clerkSpaNavigateAsync } from "../service/clerk/clerkSpaNavigate";
import { shouldSkipClerkOnCrazyGamesHost } from "../service/platformAuth/embedSources/crazyGamesHost";
import { useHistoryLocationKey } from "../service/useHistoryLocationKey";

type ClerkAuthShellProps = {
  children: React.ReactNode;
};

/**
 * When `VITE_CLERK_PUBLISHABLE_KEY` is set, wraps the tree with `ClerkProvider`
 * and mounts Clerk session → platform JWT bridge.
 * Clerk UI lives in the SSO panel (SignInClerk), not global nav.
 * Skipped on CrazyGames CDN hosts — production Clerk keys reject those origins.
 */
const ClerkAuthShell: React.FC<ClerkAuthShellProps> = ({ children }) => {
  const locationKey = useHistoryLocationKey();
  const [returnUrl, setReturnUrl] = useState(() => clerkReturnUrl());
  const routerPush = useCallback((to: string) => {
    clerkSpaNavigateAsync(to);
  }, []);
  const routerReplace = useCallback((to: string) => {
    clerkSpaNavigateAsync(to);
  }, []);

  useEffect(() => {
    setReturnUrl(clerkReturnUrl());
  }, [locationKey]);

  if (!isClerkConfigured() || shouldSkipClerkOnCrazyGamesHost()) {
    return <>{children}</>;
  }

  const publishableKey = getClerkPublishableKey();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={routerPush}
      routerReplace={routerReplace}
      signInUrl={returnUrl}
      afterSignInUrl={returnUrl}
      afterSignOutUrl={returnUrl}
      allowedRedirectOrigins={[window.location.origin]}
    >
      <ClerkSsoCallbackHost />
      <ClerkPlatformBridge />
      {children}
    </ClerkProvider>
  );
};

export default ClerkAuthShell;
