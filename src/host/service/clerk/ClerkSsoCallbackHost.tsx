import { useClerk } from "@clerk/clerk-react";
import React, { useEffect, useRef } from "react";

import { useUserManager } from "../UserManager";
import {
  clearClerkHashFromUrl,
  clerkReturnUrl,
  isClerkSsoCallbackHash,
} from "./clerkReturnUrl";
import { isClerkEnabled } from "./clerkEnv";
import { clerkSpaNavigateAsync } from "./clerkSpaNavigate";

/**
 * Finish OAuth on `#/sso-callback` without mounting a second `<SignIn />`
 * (which conflicts with the SSO modal and triggers Clerk generic errors).
 */
const ClerkSsoCallbackHostInner: React.FC = () => {
  const clerk = useClerk();
  const { user } = useUserManager();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isClerkSsoCallbackHash()) return;
    if (user?.authReq) return;
    if (!clerk.loaded || handledRef.current) return;

    handledRef.current = true;
    const returnUrl = clerkReturnUrl();

    void clerk
      .handleRedirectCallback(
        {
          redirectUrl: returnUrl,
          afterSignInUrl: returnUrl,
        },
        clerkSpaNavigateAsync
      )
      .then(() => {
        clearClerkHashFromUrl();
      })
      .catch((err) => {
        handledRef.current = false;
        console.error("[ClerkSsoCallbackHost] handleRedirectCallback failed", err);
      });
  }, [clerk, clerk.loaded, user?.authReq]);

  return null;
};

const ClerkSsoCallbackHost: React.FC = () => {
  if (!isClerkEnabled()) return null;
  return <ClerkSsoCallbackHostInner />;
};

export default ClerkSsoCallbackHost;
