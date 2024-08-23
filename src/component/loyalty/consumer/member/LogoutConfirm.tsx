import { gsap } from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import "../consumer.css";
interface Props {
  confirmOpen: boolean;
  onCancel: () => void;
}
const LogoutConfirm: React.FC<Props> = ({ confirmOpen, onCancel }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const { logout } = useUserManager();
  const { openEntry } = usePageManager();
  const { partner } = usePartnerManager();

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.fromTo(maskRef.current, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.8 });
    tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1.0, scale: 1, duration: 0.8 }, "<");
    tl.play();
  }, []);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 }, ">");
    tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.5, duration: 0.6 }, "<");
    tl.play();
  }, []);

  const confirm = useCallback(() => {
    if (!partner) return;
    if (logout) logout();
    openEntry({});
    close();
  }, [logout, partner]);
  useEffect(() => {
    if (confirmOpen) open();
    else close();
  }, [confirmOpen]);

  return (
    <>
      <div ref={maskRef} className="mask" style={{ zIndex: 1990, width: "100vw", height: "100vh" }}></div>
      <div
        ref={controllerRef}
        className="logout_control"
        style={{
          zIndex: 2000,
          opacity: 0,
        }}
      >
        <div style={{ width: 280, height: 190, backgroundColor: "white" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: 90 }}>
            <div>Are you sure to exit?</div>
          </div>
          <div
            style={{ display: "flex", justifyContent: "space-around", alignItems: "center", width: "100%", height: 90 }}
          >
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: 80,
                height: 45,
                borderRadius: 4,
                backgroundColor: "blue",
                color: "white",
              }}
              onClick={onCancel}
            >
              Cancel
            </div>
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: 80,
                height: 45,
                borderRadius: 4,
                backgroundColor: "blue",
                color: "white",
              }}
              onClick={confirm}
            >
              Confirm
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutConfirm;
