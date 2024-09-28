import { Coin } from "component/icons/AssetIcons";
import CartBar from "component/loyalty/cart/CartBar";
import CategoryHome from "component/loyalty/category/CategoryHome";
import React from "react";
import { usePageManager } from "service/PageManager";

const SlideControl: React.FC = () => {
  const { openNav, openChild } = usePageManager();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
        <div className="register-head">
          <div className="btn" onClick={openNav}>
            Home
          </div>
          <div style={{ color: "blue" }}></div>

          <div style={{ width: 45, height: 45 }} onClick={() => openChild("orderReview")}>
            <Coin></Coin>
          </div>
        </div>
        <div style={{ width: "100%", height: "100%" }}>
          <CategoryHome />
        </div>
        <CartBar />
      </div>
    </>
  );
};

export default SlideControl;
