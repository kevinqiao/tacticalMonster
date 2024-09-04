import React from "react";
import { useTerminal } from "service/TerminalManager";
import AdditionControl from "./addition/AdditionControl";
import CategoryHome from "./menu/CategoryHome";
import CartBar from "./order/CartBar";
import OrderReview from "./order/OrderReview";
const GroundLayout: React.FC = () => {
  const { terminal, direction } = useTerminal();
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
          <CategoryHome />
          <CartBar />
          <AdditionControl />
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
            <div style={{ width: "60%", height: "100%" }}>
              <div style={{ width: "90%", height: "100%" }}>
                <CategoryHome />
              </div>
            </div>
            <div style={{ width: "40%", height: "100%" }}>
              <OrderReview />
            </div>
          </div>
          <AdditionControl />
        </>
      ) : null}
    </>
  );
};

export default GroundLayout;
