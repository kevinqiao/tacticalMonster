import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";
import useLocalization from "service/LocalizationManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import "./nav.css";
const MerchantNav: React.FC = () => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
  const { user, logout } = useUserManager();
  const { app, navOpen, closeNav, openPage } = usePageManager();
  const { resources } = useLocalization();
  console.log("consumer home...");

  // const openNav = useCallback(
  //   (app: string, name: string) => {
  //     openPage({ app, name });
  //     // const tl = gsap.timeline({
  //     //   onComplete: () => {
  //     //     openPage({ app, name });
  //     //     tl.kill();
  //     //   },
  //     // });
  //     // tl.to(containerRef.current, { left: "-50vw", duration: 0.3 });
  //     // tl.play();
  //   },
  //   [openPage]
  // );
  useEffect(() => {
    if (app?.name === "consumer") {
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      if (navOpen) {
        tl.fromTo(containerRef.current, { zIndex: 9001, autoAlpha: 1, left: "-80%" }, { left: 0, duration: 0.6 });
        tl.fromTo(maskRef.current, { zIndex: 9000, autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.6 }, "<");
      } else {
        tl.to(containerRef.current, { left: "-80%", duration: 0.3 });
        tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
      }
      tl.play();
    }
  }, [app, navOpen]);
  return (
    <>
      <div ref={maskRef} className="nav_mask"></div>
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
        >
          open my member
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
          Scan
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
          Register
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
          Sign In
          {/* Sign In{`${resources["member"]["record"]}`} */}
        </div>
        <div style={{ height: 100 }} />
        {user?.uid ? (
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
            onClick={logout}
          >
            Logout
          </div>
        ) : null}
      </div>
    </>
  );
};
export default MerchantNav;
