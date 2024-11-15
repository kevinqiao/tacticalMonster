import LineItemList from "component/loyalty/order/OrderLineItemList";
import Subtotal from "component/loyalty/order/Subtotal";
import React from "react";
import "../register.css";
const OrderPanel: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
        }}
      >
        <LineItemList />
        <Subtotal />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          width: "100%",
        }}
      >
        <div className="btn">Save</div>
        <div className="btn">Pay</div>
      </div>
    </div>
  );
};

export default OrderPanel;
