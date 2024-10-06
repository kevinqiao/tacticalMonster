import CategoryHome from "component/loyalty/category/CategoryHome";
import OnlineSelector from "component/loyalty/order/OnlineSelector";
import OrderBar from "component/loyalty/order/OrderBar";
import React from "react";
import { usePageManager } from "service/PageManager";
import "../../../merchant/register/register.css";
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
                  <div style={{ color: "blue" }}>
                    <OnlineSelector />
                  </div>
                  <div style={{ width: 45, height: 45 }}></div>
                </div>
                <OrderBar />
              </>
            ) : null;
          }}
        />
      </div>
    </>
  );
};

export default SlideControl;
