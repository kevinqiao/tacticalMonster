import { Coin } from "component/icons/AssetIcons";
import React from "react";
import { usePageManager } from "service/PageManager";
import { useTerminal } from "service/TerminalManager";
import CartBar from "../../cart/CartBar";
import CategoryHome from "../../category/CategoryHome";
import AdditionControl from "../../order/addition/AdditionControl";
const GroundLayout: React.FC = () => {
  const { terminal, direction } = useTerminal();
  const { openChild } = usePageManager();
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "absolute",
              top: 0,
              right: 0,
              height: 60,
              width: 60,
            }}
          >
            <div style={{ width: 45, height: 45 }} onClick={() => openChild("orderReview")}>
              <Coin></Coin>
            </div>
          </div>
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
            <div style={{ width: "40%", height: "100%" }}></div>
          </div>
          <AdditionControl />
        </>
      ) : null}
    </>
  );
};

export default GroundLayout;
