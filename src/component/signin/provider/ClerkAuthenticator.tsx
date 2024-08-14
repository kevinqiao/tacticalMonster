import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig } from "model/PageProps";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import "../signin.css";

const AuthorizeToken: React.FC<AuthProps> = ({ provider }) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const [redirectURL, setRedirectURL] = useState<string | null>(provider ? provider.redirectURL : null);
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { authComplete } = useUserManager();
  const { currentPage, getPrePage, cancelCurrent } = usePageManager();
  const { event: accountEvent } = useEventSubscriber(["signin"], ["account"], "ClerkAuthenticator");
  const [auth, setAuth] = useState<{ user: any; status: number }>({ user: provider?.user, status: 1 });
  const convex = useConvex();

  console.log("clerk provider redirect");

  useEffect(() => {
    if (!currentPage || auth.user || auth.status === 1) return;
    const role = auth.user ? auth.user.role ?? 1 : 0;
    const appCfg: any = AppsConfiguration.find((c) => c.name === currentPage.app);
    if (appCfg?.navs) {
      const pageCfg: PageConfig | undefined = appCfg.navs.find((s: any) => s.name === currentPage.name);
      if (pageCfg) {
        const cauth = pageCfg.auth ?? 0;
        console.log(role + ":" + cauth);
        if (role < cauth) {
          playOpen(null);
        } else {
          playClose(null);
        }
      }
    }
  }, [auth, currentPage]);

  useEffect(() => {
    if (currentPage && accountEvent && accountEvent?.name === "signin") {
      playOpen(null);
    }
  }, [accountEvent, currentPage]);

  const playOpen = useCallback((timeline: any) => {
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

  const playClose = useCallback((timeline: any) => {
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
      tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 });
      tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
      tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.6, duration: 0.4 }, "<");
      tl.play();
    }, timeout);
  }, []);

  const cancel = useCallback(() => {
    cancelCurrent();
    playClose(null);
  }, [cancelCurrent]);

  useEffect(() => {
    const channelAuth = async () => {
      const t: string | null = await getToken();
      console.log("token:" + t);
      if (t && provider) {
        const res = await convex.action(api.authoize.authorize, {
          data: { jwttoken: t },
          channelId: provider.channel,
          partnerId: provider.partnerId,
        });
        if (res?.ok) {
          signOut();
          authComplete(res.message, 1);
          setAuth({ user: res.message, status: 2 });
        }
      } else setAuth({ user: null, status: 2 });
    };
    console.log(provider);
    if (provider && provider.user === null) {
      channelAuth();
    }
  }, [provider]);

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
        {auth.status === 2 && auth.user === null ? (
          <SignIn redirectUrl={redirectURL} afterSignInUrl={redirectURL} />
        ) : null}
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
