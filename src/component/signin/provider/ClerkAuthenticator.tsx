import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig } from "model/PageProps";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL, getCurrentAppConfig } from "util/PageUtils";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import "../signin.css";

const AuthorizeToken: React.FC<AuthProps> = ({ provider }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const [initCompleted, setInitCompleted] = useState(0);
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { user, authComplete } = useUserManager();
  const { partner } = usePartnerManager();
  const { currentPage, openPage, prevPage } = usePageManager();
  const { event: accountEvent } = useEventSubscriber([], ["account"]);
  const convex = useConvex();
  console.log(user);
  const redirectURL = useMemo(() => {
    if (partner && currentPage) {
      if (partner.pid > 0) {
        currentPage.params
          ? (currentPage.params["partner"] = "" + partner.pid)
          : (currentPage.params = { partner: "" + partner.pid });
      }
      const url = buildNavURL(currentPage);

      return url;
    }
  }, [partner, user, currentPage]);
  useEffect(() => {
    if (user && isSignedIn) {
      signOut();
    }
  }, [user, isSignedIn, signOut]);

  useEffect(() => {
    if (provider?.isOpen) {
      console.log("initial opening....");
      open();
      setTimeout(() => setInitCompleted(1), 800);
    } else {
      console.log("initial closing....");
      close();
      setTimeout(() => setInitCompleted(1), 100);
    }
  }, [provider]);
  useEffect(() => {
    if (!currentPage || !initCompleted) return;
    const role = user ? user.role ?? 1 : 0;
    const appCfg: any = AppsConfiguration.find((c) => c.name === currentPage.app);
    if (appCfg?.navs) {
      const pageCfg: PageConfig | undefined = appCfg.navs.find((s: any) => s.name === currentPage.name);
      if (pageCfg) {
        const cauth = pageCfg.auth ?? 0;
        if (role < cauth) {
          console.log("opening....");
          open();
        } else {
          console.log("closing....");
          close();
        }
      }
    }
  }, [user, initCompleted, currentPage]);

  useEffect(() => {
    if (accountEvent && accountEvent?.name === "signin") {
      open();
    }
  }, [accountEvent]);

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.8 });
    tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.8 }, "<");
    tl.to(controllerRef.current, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<");
    tl.play();
  }, []);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.1 });
    tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.1 }, "<");
    tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.6, duration: 0.1 }, "<");
    tl.play();
  }, []);
  const cancel = useCallback(() => {
    if (prevPage) openPage(prevPage);
    else {
      const appConfig = getCurrentAppConfig();
      if (appConfig.entry) openPage({ name: appConfig.entry, app: appConfig.name });
    }
    close();
  }, []);

  useEffect(() => {
    const channelAuth = async () => {
      const t: string | null = await getToken();
      if (t && provider) {
        // const res = await convex.action(api.authoize.authorizeClerk, { jwttoken: t, partner: partner.pid });
        const res = await convex.action(api.authoize.authorize, {
          data: { jwttoken: t },
          channelId: provider.channel,
          partnerId: provider.partnerId,
        });
        if (res?.ok) {
          authComplete(res.message, 1);
        }
      }
    };
    if (provider && isSignedIn) {
      close();
      channelAuth();
    }
  }, [isSignedIn, provider, signOut]);
  return (
    <>
      <div
        ref={maskRef}
        className="mask"
        style={{
          zIndex: 1990,
          width: "100vw",
          height: "100vh",
          opacity: 0,
          visibility: "hidden",
          backgroundColor: prevPage ? "black" : "yellow",
        }}
      ></div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} onClick={cancel} />
      <div
        ref={controllerRef}
        className="signin_control"
        style={{
          zIndex: 2000,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        {!isSignedIn && redirectURL ? <SignIn redirectUrl={redirectURL} afterSignInUrl={redirectURL} /> : null}
      </div>
    </>
  );
};

const ClerkAuthenticator: React.FC<AuthProps> = ({ provider }) => {
  return (
    <ClerkProvider publishableKey="pk_test_bGVuaWVudC1sb3VzZS04Ni5jbGVyay5hY2NvdW50cy5kZXYk">
      <AuthorizeToken provider={provider} />
    </ClerkProvider>
  );
};

export default ClerkAuthenticator;
