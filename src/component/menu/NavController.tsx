import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import useEventSubscriber from "service/EventManager";
import useLocalization from "service/LocalizationManager";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";

const NavController: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useUserManager();
  const { navOpen, closeNav, openPage } = usePageManager();
  const { createEvent } = useEventSubscriber([], []);
  const { resources } = useLocalization();
  console.log("consumer home...");
  const signin = useCallback(() => {
    const loginEvent = { name: "signin", topic: "account", delay: 0 };
    createEvent(loginEvent);
  }, [createEvent]);
  const openMemberCenter = useCallback(() => {
    const page = { name: "member", app: "consumer" };
    openPage(page);
  }, [openPage]);
  const openScan = useCallback(() => {
    const page = { name: "scanOrder", app: "consumer" };
    openPage(page);
  }, [openPage]);
  const openRegister = useCallback(() => {
    const page = { name: "register", app: "consumer" };
    openPage(page);
  }, [openPage]);
  console.log("nav open:" + navOpen);
  useEffect(() => {
    if (navOpen) {
      gsap.to(containerRef.current, { autoAlpha: 1, zIndex: 5000, duration: 0.5 });
    } else gsap.to(containerRef.current, { autoAlpha: 0, duration: 0.5 });
  }, [navOpen]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "100vh",
          color: "blue",
          backgroundColor: "red",
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <div
          style={{
            cursor: "pointer",
            width: "200px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openMemberCenter()}
        >
          open my member
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "200px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openScan()}
        >
          Scan
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "200px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openRegister()}
        >
          Register
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "200px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => closeNav()}
        >
          SignIn
        </div>
        <div style={{ height: 100 }} />
        {user?.uid ? (
          <div
            style={{
              cursor: "pointer",
              width: "200px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "blue",
              color: "white",
            }}
            onClick={logout}
          >
            Logout
          </div>
        ) : null}
      </div>
    </>
  );
};
export default NavController;
