import gsap from "gsap";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePageManager } from "service/PageManager";
import { usePlatform } from "service/PlatformManager";
import { useUserManager } from "service/UserManager";
import { findContainer } from "util/PageUtils";
import "./signin.css";
const PROVIDERS: Record<
  string,
  string
> = {
  "telegram": "TelegramAuthenticator",
  "discord": "DiscordAuthenticator",
  "twitter": "TwitterAuthenticator",
  "google": "GoogleAuthenticator",
  "facebook": "FacebookAuthenticator",
  "web": "WebAuthenticator",
}
export interface AuthenticatorHandle extends HTMLDivElement {
  someMethod(): void;
}

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
}
export interface AuthInit {
  open: number;
  // cancelPage: PageItem | null;
  cancel: () => void;
}
export interface AuthProps {
  authInit?: AuthInit;
}
// gsap.registerPlugin(MotionPathPlugin);
// const sso_client = new ConvexReactClient("https://cool-salamander-393.convex.cloud");
const SSOController: React.FC = () => {
  const { user } = useUserManager();
  const { platform, configuration } = usePlatform();
  const { pageContainers, currentPage, changeEvent, authReq, cancelAuth } = usePageManager();
  const [authInit, setAuthInit] = useState<AuthInit | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);

  const SelectedComponent = useMemo(() => {
    return lazy(() => import(`./provider/CustomAuthenticator`));
  }, []);

  const isOpen = useMemo(() => {
    if (authReq) return true;
    // const page = currentPage;
    if (currentPage) {
      const container = findContainer(pageContainers, currentPage.uri);
      return container?.auth === 1 && (!user || !user.uid) ? true : false;
    }
    return false;
  }, [authReq, currentPage, changeEvent, user, pageContainers]);
  const canClose = useMemo(() => {
    return currentPage && authReq;
  }, [currentPage, authReq]);
  const close = useCallback(() => {
    if (canClose) {
      cancelAuth();
    }
  }, [cancelAuth, canClose]);

  useEffect(() => {
    if (containerRef.current && maskRef.current) {
      const tl = gsap.timeline();
      if (isOpen) {
        tl.fromTo(maskRef.current,
          { opacity: 0 },
          { opacity: 0.5, duration: 0.3 }, 0);
        tl.fromTo(containerRef.current,
          { x: "100%" },
          { x: 0, duration: 0.3, ease: "power2.out" }, 0);
      } else {
        tl.to(maskRef.current, {
          opacity: 0,
          duration: 0.3
        }, 0);
        tl.to(containerRef.current, {
          x: "100%",
          duration: 0.3,
          ease: "power2.in"
        }, 0);
      }
      tl.play();
    }
  }, [isOpen]);

  return (
    // <ConvexProvider client={sso_client}>
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "transparent", pointerEvents: "none", overflow: "hidden" }}>
      {/* 遮罩层 */}
      <div ref={maskRef} style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        opacity: 0,
        overflow: "hidden",
        pointerEvents: isOpen ? "auto" : "none"
      }} onClick={close} />

      {/* 滑动面板 */}
      <div ref={containerRef} style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "40%",
        height: "100%",
        minWidth: 350,
        maxWidth: 500,
        pointerEvents: "auto",
        overflow: "hidden",
        zIndex: 1
      }}>

        <>
          <Suspense fallback={<div />}>
            <SelectedComponent authInit={authInit} />
          </Suspense>
          {canClose && (
            <div className="exit-menu" onClick={close}></div>
          )}
        </>

      </div>
    </div>

    // </ConvexProvider>
  );
};

export default SSOController;
