import { MemberMenuCloseBtn } from "component/common/StyledComponents";
import { useConvex } from "convex/react";
import { gsap } from "gsap";
import PageProps from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/_generated/api";
import "../consumer.css";

const MenuControl: React.FC<{ menu: { name: string; path: string } | null; onClose: () => void }> = ({
  menu,
  onClose,
}) => {
  const { width, height } = useCoord();
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.fromTo(maskRef.current, { autoAlpha: 0 }, { autoAlpha: 0.7, duration: 0.8 });
    tl.fromTo(controllerRef.current, { autoAlpha: 1, x: width }, { x: 50, duration: 0.8 }, "<");
    // tl.fromTo(closeBtnRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, ">");
    tl.play();
  }, []);

  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });

    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 });
    tl.to(controllerRef.current, { autoAlpha: 0, x: width, duration: 0.6 }, "<");
    // tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.1 }, ">");
    tl.play();
  }, []);

  useEffect(() => {
    console.log(menu);
    if (menu) {
      open();
    } else {
      close();
    }
  }, [menu]);

  const render = useMemo(() => {
    if (menu) {
      const SelectedComponent: FunctionComponent = lazy(() => import(`${menu.path}`));
      return (
        <Suspense fallback={<div />}>
          <SelectedComponent />
        </Suspense>
      );
    }
  }, [menu]);
  return (
    <>
      <div
        ref={maskRef}
        className="mask"
        style={{ zIndex: 1990, width: "100vw", height: "100vh", opacity: 0 }}
        onClick={onClose}
      ></div>
      <div
        ref={controllerRef}
        className="menu_control"
        style={{
          zIndex: 2000,
          opacity: 0,
          backgroundColor: "red",
        }}
      >
        <MemberMenuCloseBtn ref={closeBtnRef} style={{ zIndex: 2001 }} onClick={onClose} />
        {render}
      </div>
    </>
  );
};

const MemberHome: React.FC<PageProps> = (pageProp) => {
  const { user, logout } = useUserManager();
  const { openPage } = usePageManager();
  const [selectedMenu, setSelectedMenu] = useState<{ name: string; path: string } | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const convex = useConvex();

  useEffect(() => {
    const asyncCall = async () => {
      const reward = await convex.query(api.loyalty.reward.openReward, { partnerId: "1000", orderId: "12344" });
      console.log(reward);
    };
    asyncCall();
  }, []);

  return <></>;
};

export default MemberHome;
