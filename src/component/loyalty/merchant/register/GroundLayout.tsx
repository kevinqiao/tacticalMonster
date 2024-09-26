import AdditionControl from "component/loyalty/order/addition/AdditionControl";
import OrderBar from "component/loyalty/order/OrderBar";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useTerminal } from "service/TerminalManager";
import CategoryHome from "../../category/CategoryHome";
import OrderPanel from "./OrderPanel";
const GroundLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height, terminal, direction } = useTerminal();
  const { openNav } = usePageManager();
  const curTabRef = useRef<number>(0);
  const openCategory = useCallback(() => {
    curTabRef.current = 1;
    gsap.to(containerRef.current, { x: -window.innerWidth, duration: 0.3 });
  }, []);
  const back = useCallback(() => {
    curTabRef.current = 0;
    gsap.to(containerRef.current, { x: 0, duration: 0.3 });
  }, []);
  useEffect(() => {
    if (curTabRef.current === 0) gsap.to(containerRef.current, { x: 0, duration: 0.3 });
    else gsap.to(containerRef.current, { x: -window.innerWidth, duration: 0.3 });
  }, [width, height]);

  return (
    <>
      {terminal > 1 ? (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          <div ref={containerRef} style={{ display: "flex", justifyContent: "flex-start", width: "200vw" }}>
            <div style={{ width: "100vw", height: "100vh", backgroundColor: "blue" }}>
              <div className="register-head">
                <div className="btn" onClick={openNav}>
                  Home
                </div>
              </div>
              <div className="btn" onClick={openCategory}>
                Place Order
              </div>
            </div>
            <div style={{ position: "relative", top: 0, left: 0, width: "100vw", height: "100vh" }}>
              <div className="register-head">
                <div className="btn" onClick={back}>
                  Back
                </div>
              </div>
              <CategoryHome />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                }}
              >
                <OrderBar />
              </div>
            </div>
          </div>
          {/* <AdditionControl /> */}
        </div>
      ) : null}

      {terminal <= 1 ? (
        <>
          <div
            style={{
              position: "relative",
              top: 0,
              left: 0,
              display: "flex",
              justifyContent: "space-around",
              width: "100vw",
              height: "100vh",
              backgroundColor: "white",
            }}
          >
            <div style={{ width: "49%", height: "100%" }}>
              <div style={{ width: "100%", height: "100%" }}>
                <div className="register-head">
                  <div className="btn" onClick={openNav}>
                    Home
                  </div>
                </div>
                <CategoryHome />
              </div>
            </div>
            <div style={{ width: "49%", height: "100%" }}>
              <div className="register-head"></div>
              <OrderPanel />
            </div>
          </div>
          <AdditionControl />
        </>
      ) : null}
    </>
  );
};

export default GroundLayout;
