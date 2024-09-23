import LineItemList from "component/loyalty/order/LineItemList";
import Subtotal from "component/loyalty/order/Subtotal";
import React from "react";
import "../../order/order.css";

const OrderPanel: React.FC = () => {
  return (
    <div className="order-container">
      <div style={{ width: "100%", height: "100%", overflowX: "hidden" }}>
        <LineItemList />
      </div>
      <Subtotal />
      <div style={{ height: 40 }}></div>
      <div className="order-control">
        <div className="btn">Save</div>
        <div className="btn">Pay</div>
      </div>
    </div>
  );
};

export default OrderPanel;
