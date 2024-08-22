import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL, getPageConfig } from "util/PageUtils";
import { api } from "../../../convex/_generated/api";
import { AuthInit, AuthProps } from "../SSOController";
import "../signin.css";
import useClerkAnimate from "./hook/useClerkAnimate";

const AuthorizeToken: React.FC<AuthProps> = ({ provider }) => {
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { user, authComplete } = useUserManager();
  const { partner } = usePartnerManager();
  const { currentPage } = usePageManager();
  // const { event } = useEventSubscriber(["signin"], ["account"]);
  // const [reqOpen, setReqOpen] = useState<number>(-1);
  const [authInit, setAuthInit] = useState<AuthInit | null>(null);

  useEffect(() => {
    if (!currentPage || !user || !partner) return;
    const role = user.uid ? user.role ?? 1 : 0;

    const pageConfig = getPageConfig(currentPage.app, currentPage.name);
    if (pageConfig) {
      const open = role < (pageConfig.auth ?? 0) ? 1 : 0;
      console.log("open:" + open);
      const params: { [k: string]: string } = currentPage?.params
        ? { ...currentPage.params, partner: partner.pid + "" }
        : { partner: partner.pid + "" };
      const url = buildNavURL({ ...currentPage, params: { ...params, redirect: "1" } }) ?? "";
      setAuthInit({ open, redirectURL: url, afterSignedURL: url, params });
    }
  }, [partner, currentPage, user]);

  useClerkAnimate({
    loadingRef,
    maskRef,
    controllerRef,
    closeBtnRef,
    authInit,
  });
  const convex = useConvex();

  // const close = useCallback(() => {
  //   setReqOpen(0);
  // }, []);

  useEffect(() => {
    const channelAuth = async () => {
      const t: string | null = await getToken();
      console.log("token:" + t);
      if (t && provider) {
        const res = await convex.action(api.authoize.authorize, {
          data: { jwttoken: t },
          channelId: provider.channelId,
          partnerId: provider.partnerId,
        });
        if (res?.ok) {
          signOut();
          if (authComplete) authComplete(res.message, 1);
        }
      }
    };
    channelAuth();
  }, [provider]);

  return (
    <>
      <>
        <div ref={maskRef} className="clerk_mask">
          {/* <div ref={loadingRef} style={{ color: "white", fontSize: 20, opacity: 0, visibility: "hidden" }}>
              Loading....
            </div> */}
        </div>
        <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} />
        <div ref={controllerRef} className="signin_control">
          {!isSignedIn && authInit ? (
            <SignIn redirectUrl={authInit.redirectURL} afterSignInUrl={authInit.afterSignedURL} />
          ) : null}
        </div>
      </>
    </>
  );
};

const ClerkAuthenticator: React.FC<AuthProps> = (props) => {
  return (
    <ClerkProvider publishableKey="pk_test_bGVuaWVudC1sb3VzZS04Ni5jbGVyay5hY2NvdW50cy5kZXYk">
      <AuthorizeToken {...props} />
    </ClerkProvider>
  );
};
export default ClerkAuthenticator;
