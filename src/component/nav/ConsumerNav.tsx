import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import useLocalization from "service/LocalizationManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import "./nav.css";
const ConsumerNav: React.FC = () => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
  const { user, logout } = useUserManager();
  const { app, navOpen, closeNav, openPage } = usePageManager();
  const { resources } = useLocalization();
  console.log("merchant home..." + app);

  useEffect(() => {
    if (app?.name === "consumer" || app?.name === "merchant") {
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      if (navOpen) {
        tl.fromTo(containerRef.current, { zIndex: 101, autoAlpha: 1, left: "-80%" }, { left: 0, duration: 0.6 });
        tl.fromTo(maskRef.current, { zIndex: 100, autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.6 }, "<");
      } else {
        tl.to(containerRef.current, { left: "-80%", duration: 0.3 });
        tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
      }
      tl.play();
    }
  }, [app, navOpen]);
  const openNavMenu = useCallback(
    (name: string, appName?: string) => {
      if (!app) return;
      closeNav();
      const pitem = { app: appName ?? app.name, name };
      openPage(pitem);
    },
    [app, openPage, closeNav]
  );

  return (
    <>
      <div ref={maskRef} className="nav_mask" onClick={closeNav}></div>
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
          width: "70vw",
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
            width: "80%",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openNavMenu("onlineOrder", "consumer")}
        >
          Online Order
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "80%",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openPage({ app: "consumer", name: "scanOrder" })}
        >
          Game Center
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "80%",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={() => openPage({ app: "consumer", name: "register" })}
        >
          Contact
        </div>
        <div style={{ height: 50 }} />
        <div
          style={{
            cursor: "pointer",
            width: "80%",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
        >
          My Account
          {/* Sign In{`${resources["member"]["record"]}`} */}
        </div>
      </div>
    </>
  );
};
export default ConsumerNav;
