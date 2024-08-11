import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig } from "model/PageProps";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL, getCurrentAppConfig } from "util/PageUtils";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import "../signin.css";

const AuthorizeToken: React.FC<AuthProps> = ({ provider }) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const [initCompleted, setInitCompleted] = useState(0);
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { user, authComplete } = useUserManager();
  const { currentPage, openPage, getPrePage } = usePageManager();
  const { event: accountEvent } = useEventSubscriber([], ["account"]);
  const convex = useConvex();
  const redirectURL = useMemo(() => {
    if (currentPage) {
      const url = buildNavURL(currentPage);
      return url;
    }
  }, [currentPage]);
  useEffect(() => {
    if (user && isSignedIn) {
      signOut();
    }
  }, [user, isSignedIn, signOut]);

  useEffect(() => {
    if (!provider) return;
    const tl = gsap.timeline({
      onComplete: () => {
        setInitCompleted(1);
        tl.kill();
      },
    });
    if (provider?.isOpen) {
      console.log("initial opening....");
      open(tl);
    } else {
      console.log("initial closing....");
      close(tl);
    }
  }, [provider]);
  useEffect(() => {
    if (!currentPage || initCompleted === 0) return;
    const role = user ? user.role ?? 1 : 0;
    const appCfg: any = AppsConfiguration.find((c) => c.name === currentPage.app);
    if (appCfg?.navs) {
      const pageCfg: PageConfig | undefined = appCfg.navs.find((s: any) => s.name === currentPage.name);
      if (pageCfg) {
        const cauth = pageCfg.auth ?? 0;
        if (role < cauth) {
          console.log("opening....");
          open(null);
        } else {
          console.log("closing....");
          close(null);
        }
      }
    }
  }, [user, initCompleted, currentPage]);

  useEffect(() => {
    if (accountEvent && accountEvent?.name === "signin") {
      open(null);
    }
  }, [accountEvent]);

  const open = useCallback((timeline: any) => {
    let timeout = 0;
    let tl = timeline;
    if (timeline == null) {
      const gtl = timelineRef.current;
      if (!gtl || !gtl.isActive) {
        tl = gsap.timeline({
          onComplete: () => {
            tl.kill();
          },
        });
        timelineRef.current = tl;
      } else {
        tl = gtl;
        timeout = gtl.totalDuration() - gtl.totalTime();
      }
    }
    setTimeout(() => {
      tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.8 });
      tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.8 }, "<");
      tl.to(controllerRef.current, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<");
      tl.play();
    }, timeout);
  }, []);

  const close = useCallback((timeline: any) => {
    let timeout = 0;
    let tl = timeline;
    if (timeline == null) {
      const gtl = timelineRef.current;
      if (!gtl || !gtl.isActive) {
        tl = gsap.timeline({
          onComplete: () => {
            tl.kill();
          },
        });
        timelineRef.current = tl;
      } else {
        tl = gtl;
        timeout = gtl.totalDuration() - gtl.totalTime();
      }
    }
    setTimeout(() => {
      tl.to(maskRef.current, { autoAlpha: 0, duration: 0.1 });
      tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.1 }, "<");
      tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.6, duration: 0.1 }, "<");
      tl.play();
    }, timeout);
  }, []);

  const cancel = useCallback(() => {
    const prevPage = getPrePage();
    if (prevPage) openPage(prevPage);
    else {
      const appConfig = getCurrentAppConfig();
      if (appConfig.entry) openPage({ name: appConfig.entry, app: appConfig.name });
    }
    close(null);
  }, []);

  useEffect(() => {
    const channelAuth = async () => {
      const t: string | null = await getToken();
      if (t && provider) {
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
      close(null);
      channelAuth();
    }
  }, [isSignedIn, provider, signOut]);
  return (
    <>
      <div
        ref={maskRef}
        className="mask"
        style={{
          zIndex: 990,
          width: "100vw",
          height: "100vh",
          opacity: 0,
          visibility: "hidden",
          backgroundColor: getPrePage() ? "black" : "yellow",
        }}
      ></div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} onClick={cancel} />
      <div
        ref={controllerRef}
        className="signin_control"
        style={{
          zIndex: 1000,
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
