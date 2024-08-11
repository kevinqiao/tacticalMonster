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
import LogoutConfirm from "./LogoutConfirm";

const MenuControl: React.FC<{ menuComponent: any | null | undefined; onClose: () => void }> = ({
  menuComponent,
  onClose,
}) => {
  const { width, height } = useCoord();
  const maskRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const SelectedComponent: FunctionComponent = menuComponent?.component;
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
    if (menuComponent) {
      open();
    } else {
      close();
    }
  }, [menuComponent]);
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
        {SelectedComponent ? (
          <Suspense
            fallback={
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  color: "white",
                  backgroundColor: "blue",
                }}
              >
                Loading
              </div>
            }
          >
            <SelectedComponent />
          </Suspense>
        ) : null}
      </div>
    </>
  );
};

const MemberHome: React.FC<PageProps> = (pageProp) => {
  const { width, height } = useCoord();
  const { user, logout } = useUserManager();
  const { openEntry } = usePageManager();
  const [menu, setMenu] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [components, setComponents] = useState<{ name: string; component: any }[]>([]);
  const convex = useConvex();
  const component = useMemo(() => {
    if (menu) {
      return components.find((c) => c.name === menu);
    } else return null;
  }, [menu]);

  useEffect(() => {
    if (pageProp.config?.children) {
      const cs: { name: string; component: any }[] = [];
      for (const child of pageProp.config.children) {
        const c = child.uri ? lazy(() => import(`${child.path}`)) : null;
        if (c) cs.push({ name: child.name, component: c });
      }
      setComponents(cs);
    }
  }, [pageProp]);
  useEffect(() => {
    const asyncCall = async () => {
      const reward = await convex.query(api.loyalty.reward.openReward, { partnerId: "1000", orderId: "12344" });
      console.log(reward);
    };
    asyncCall();
  }, []);
  // const signout = useCallback(() => {
  //   logout();
  //   openEntry();
  // }, [logout, openEntry]);

  const render = useMemo(() => {
    return (
      <>
        <div style={{ height: "40vh", width: "100vw" }}></div>
        <div style={{ width: "100vw" }}>
          {components.map((c, index) => (
            <div
              key={c.name}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "70%",
                height: 60,
                backgroundColor: "blue",
                color: "white",
                borderStyle: "solid",
                borderWidth: "2px 2px 2px 2px",
                borderColor: "white",
              }}
              onClick={() => setMenu(c.name)}
            >
              {c.name}
            </div>
          ))}
          <div
            key={"home"}
            style={{
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "70%",
              height: 60,
              backgroundColor: "blue",
              color: "white",
              borderStyle: "solid",
              borderWidth: "2px 2px 2px 2px",
              borderColor: "white",
            }}
            onClick={openEntry}
          >
            Back To Home
          </div>
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            cursor: "pointer",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
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
            onClick={() => setLogoutConfirmOpen(true)}
          >
            Logout
          </div>
        </div>
        <MenuControl menuComponent={component} onClose={() => setMenu(null)} />
        <LogoutConfirm confirmOpen={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} />
      </>
    );
  }, [pageProp, components, component, logoutConfirmOpen, user, height, width]);
  return <>{render}</>;
};

export default MemberHome;
