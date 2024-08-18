import { ClerkProvider, SignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { AuthCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../convex/_generated/api";
import { AuthProps } from "../SSOController";
import "../signin.css";

const AuthorizeToken: React.FC<AuthProps> = ({ provider, authInit, reqOpen, onClose }) => {
  // const divRef = useRef<HTMLDivElement>(null);

  // const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { authComplete } = useUserManager();
  const convex = useConvex();

  useEffect(() => {
    if (reqOpen === 1) setTimeout(() => playOpen(null), 200);
    else if (reqOpen === 0) playClose(null);
  }, [reqOpen]);

  useEffect(() => {
    if (authInit === null) return;
    const { open } = authInit;
    if (open > 0 && !isSignedIn) setTimeout(() => playOpen(null), 200);
    else playClose(null);
  }, [authInit, isSignedIn]);

  const playOpen = useCallback((timeline: any) => {
    let tl = timeline;
    if (timeline == null) {
      tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
    }
    tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.8 });
    tl.to(controllerRef.current, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<");

    tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.2 }, ">=-0.2");
    tl.play();
  }, []);

  const playClose = useCallback((timeline: any) => {
    let tl = timeline;
    if (timeline == null) {
      tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
    }

    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 });
    tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
    tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.6, duration: 0.4 }, "<");
    tl.play();
  }, []);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        onClose();
        tl.kill();
      },
    });
    playClose(tl);
  }, []);

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
        console.log(res);
        if (res?.ok) {
          signOut();
          authComplete(res.message, 1);
        }
      }
    };
    channelAuth();
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
          backgroundColor: "black",
        }}
      ></div>
      <AuthCloseBtn ref={closeBtnRef} style={{ zIndex: 2001, opacity: 0, visibility: "hidden" }} onClick={close} />
      <div
        ref={controllerRef}
        className="signin_control"
        style={{
          zIndex: 1000,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        {!isSignedIn && authInit && (authInit.open > 0 || reqOpen > 0) ? (
          <SignIn redirectUrl={authInit.redirectURL} afterSignInUrl={authInit.afterSignedURL} />
        ) : null}
      </div>
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
