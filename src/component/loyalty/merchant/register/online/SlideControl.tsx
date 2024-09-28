import CategoryHome from "component/loyalty/category/CategoryHome";
import AdditionControl from "component/loyalty/order/addition/AdditionControl";
import OrderBar from "component/loyalty/order/OrderBar";
import React from "react";
import { usePageManager } from "service/PageManager";

const SlideControl: React.FC = () => {
  const { openNav } = usePageManager();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
        <div className="register-head">
          <div className="btn" onClick={openNav}>
            Home
          </div>
          <div style={{ color: "blue" }}></div>
          <div>
            <AdditionControl />
          </div>
        </div>
        <div style={{ width: "100%", height: "100%" }}>
          <CategoryHome />
        </div>
        <OrderBar />
      </div>
    </>
  );
};

export default SlideControl;
