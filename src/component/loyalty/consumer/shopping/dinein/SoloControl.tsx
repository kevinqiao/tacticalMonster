import { Coin } from "component/icons/AssetIcons";
import CartBox from "component/loyalty/cart/CartBox";
import CategoryHome from "component/loyalty/category/CategoryHome";
import { useCartManager } from "component/loyalty/service/OrderManager";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";

const SoloControl: React.FC = () => {
  const { openNav, openChild } = usePageManager();
  const { order, clear, submit } = useCartManager();
  const confirm = useCallback(() => {
    submit();
  }, [submit]);
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
                Home
              </div>
            </div>
            <div style={{ position: "relative", top: 0, left: 0, width: "100%", height: "100%", overflowY: "auto" }}>
              <CategoryHome />
            </div>
          </div>
        </div>
        <div style={{ width: "49%", height: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                backgroundColor: "blue",
                color: "white",
              }}
            >
              <div style={{ width: 45 }}></div>
              <div>Table</div>
              <div style={{ width: 45, height: 45 }} onClick={() => openChild("orderReview")}>
                <Coin></Coin>
              </div>
            </div>
            <div style={{ width: "100%", height: "100%" }}>
              <CartBox />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginTop: 30 }}>
              <div className="btn" onClick={clearBox}>
                Clear
              </div>
              <div className="btn" onClick={confirm}>
                Submit
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SoloControl;
