import { useAuth, useClerk } from "@clerk/clerk-react";

import React, { useEffect, useRef } from "react";



import { useClerkSignIn } from "@/component/lobby/shared/useClerkSignIn";



import { usePartnerManager } from "../PartnerManager";

import { useUserManager } from "../UserManager";

import {

  clearClerkAutoExchangeSuppress,

  registerClerkSignOut,

  shouldSuppressClerkAutoExchange,

} from "./clerkSessionBridge";

import { isClerkConfigured } from "./clerkEnv";
import { clerkReturnUrl } from "./clerkReturnUrl";



/** After Clerk sign-in, exchange session token for platform JWT (cid=1). */

const ClerkPlatformBridgeInner: React.FC = () => {

  const clerk = useClerk();

  const { isSignedIn, isLoaded, getToken } = useAuth();

  const { isAuthenticated } = useUserManager();

  const { partnerPid, partnerResolveReady } = usePartnerManager();

  const { exchangeSession } = useClerkSignIn({ partnerId: partnerPid });

  const busyRef = useRef(false);



  useEffect(() => {

    return registerClerkSignOut(() =>
      clerk.signOut({ redirectUrl: clerkReturnUrl() })
    );

  }, [clerk]);



  useEffect(() => {

    if (!isLoaded) return;

    if (!isSignedIn) {

      clearClerkAutoExchangeSuppress();

    }

  }, [isLoaded, isSignedIn]);



  useEffect(() => {

    if (!isLoaded || !isSignedIn || isAuthenticated || !partnerResolveReady) return;

    if (shouldSuppressClerkAutoExchange()) return;



    const tryExchange = async () => {

      if (busyRef.current || shouldSuppressClerkAutoExchange()) return;

      busyRef.current = true;

      try {

        const token = await getToken();

        if (!token) return;

        await exchangeSession(token);

      } finally {

        busyRef.current = false;

      }

    };



    void tryExchange();

    const id = window.setInterval(() => {

      void tryExchange();

    }, 800);



    return () => window.clearInterval(id);

  }, [exchangeSession, getToken, isAuthenticated, isLoaded, isSignedIn, partnerResolveReady]);



  return null;

};



/** Must render only as a descendant of `ClerkProvider`. */

const ClerkPlatformBridge: React.FC = () => {

  if (!isClerkConfigured()) return null;

  return <ClerkPlatformBridgeInner />;

};



export default ClerkPlatformBridge;

