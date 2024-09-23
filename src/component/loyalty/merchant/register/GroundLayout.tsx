import OrderBar from "component/loyalty/order/OrderBar";
import React from "react";
import { usePageManager } from "service/PageManager";
import { useTerminal } from "service/TerminalManager";
import CategoryHome from "../../category/CategoryHome";
import AdditionControl from "../../order/addition/AdditionControl";
import OrderPanel from "./OrderPanel";
const GroundLayout: React.FC = () => {
  const { terminal, direction } = useTerminal();
  const { openNav } = usePageManager();
  console.log("terminal:" + terminal);
  return (
    <>
      {terminal > 1 ? (
        <div
          style={{
            position: "relative",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            overflowY: "auto",
            backgroundColor: "white",
          }}
        >
          <div className="register-head">
            <div className="btn" onClick={openNav}>
              Home
            </div>
          </div>
          <CategoryHome />
          <OrderBar />
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
              width: "100vw",
              height: "100vh",
              backgroundColor: "white",
            }}
          >
            <div style={{ width: "50%", height: "100%" }}>
              <div style={{ width: "90%", height: "100%" }}>
                <div className="register-head"></div>
                <CategoryHome />
              </div>
            </div>
            <div style={{ width: "50%", height: "100%" }}>
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
