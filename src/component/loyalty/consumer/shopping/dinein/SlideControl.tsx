import { Coin } from "component/icons/AssetIcons";
import CartBar from "component/loyalty/cart/CartBar";
import CategoryHome from "component/loyalty/category/CategoryHome";
import React from "react";
import { usePageManager } from "service/PageManager";

const SlideControl: React.FC = () => {
  const { openNav, openChild } = usePageManager();

  return (
    <>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
        <CategoryHome
          renderBar={(isCategory) => {
            return isCategory ? (
              <>
                <div className="register-head">
                  <div className="btn" onClick={openNav}>
                    Home
                  </div>
                  <div style={{ color: "blue" }}></div>
                  <div style={{ width: 45, height: 45 }} onClick={() => openChild("orderReview")}>
                    <Coin></Coin>
                  </div>
                </div>
                <CartBar />
              </>
            ) : null;
          }}
        />
      </div>
    </>
  );
};

export default SlideControl;
