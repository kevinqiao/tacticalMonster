import CategoryHome from "component/loyalty/category/CategoryHome";
import OrderPanel from "component/loyalty/order/OrderPanel";
import { useOrderManager } from "component/loyalty/service/OrderManager";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";

const SoloControl: React.FC = () => {
  const { app, openNav, openChild } = usePageManager();
  const { order, clear } = useOrderManager();

  const clearBox = useCallback(() => {
    clear();
  }, [clear]);
  return (
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
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div className="register-head">
              <div className="btn" onClick={openNav}>
                Home1
              </div>
            </div>
            <div style={{ position: "relative", top: 0, left: 0, width: "100%", height: "100%", overflowY: "auto" }}>
              <CategoryHome />
            </div>
          </div>
        </div>
        <div style={{ width: "49%", height: "100%" }}>
          <OrderPanel />
        </div>
      </div>
    </>
  );
};

export default SoloControl;
