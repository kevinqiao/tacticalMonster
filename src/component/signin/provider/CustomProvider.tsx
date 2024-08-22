import { AuthCloseBtn } from "component/common/StyledComponents";
import { gsap } from "gsap";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { AuthenticatorHandle, AuthProps } from "../SSOController";

const CustomProvider = forwardRef<AuthenticatorHandle, AuthProps>(({ provider, authInit }, ref) => {
  useImperativeHandle(ref, () => {
    return {
      someMethod() {
        console.log("Method in ClerkAuthenticator called");
      },
    } as AuthenticatorHandle; // 类型断言为 ClerkAuthenticatorHandle
  });
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const { currentPage } = usePageManager();

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    playOpen(tl);
  }, [provider]);

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
    tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.8 }, "<");
    tl.to(controllerRef.current, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<");
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
    playClose(null);
  }, [currentPage]);
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
        <div style={{ width: "100%", height: "100%", backgroundColor: "yello" }} />
      </div>
    </>
  );
});
CustomProvider.displayName = "CustomProvider";
export default CustomProvider;
