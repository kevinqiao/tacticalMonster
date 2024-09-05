import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import useLocalization from "service/LocalizationManager";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";

const MerchantNav: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { partner } = usePartnerManager();
  const { user, logout } = useUserManager();
  const { app, navOpen, closeNav, openPage } = usePageManager();
  const { resources } = useLocalization();
  console.log("consumer home...");

  const openNav = useCallback(
    (app: string, name: string) => {
      const tl = gsap.timeline({
        onComplete: () => {
          openPage({ app, name });
          tl.kill();
        },
      });
      tl.to(containerRef.current, { left: "-50vw", duration: 0.3 });
      tl.play();
    },
    [openPage]
  );
  useEffect(() => {
    if (navOpen && app?.name === "consumer") {
      gsap.fromTo(containerRef.current, { autoAlpha: 1, left: "-50%" }, { left: 0, duration: 0.6 });
    }
  }, [app, navOpen]);
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
          width: "50vw",
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
          onClick={() => openNav("consumer", "scanOrder")}
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
          onClick={() => openNav("consumer", "register")}
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
        >
          Sign In
          {/* Sign In{`${resources["member"]["record"]}`} */}
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
          >
            Logout
          </div>
        ) : null}
      </div>
    </>
  );
};
export default MerchantNav;
