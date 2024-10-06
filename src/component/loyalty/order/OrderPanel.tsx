import React from "react";
import "../merchant/register/register.css";
import OnlineSelector from "./OnlineSelector";
import "./order.css";
import LineItemList from "./OrderLineItemList";
import OrderLocation from "./OrderLocation";
import Subtotal from "./Subtotal";
const OrderPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  return (
    <div className="order-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          height: 60,
          backgroundColor: "blue",
          color: "white",
        }}
      >
        <div style={{ width: 45 }}></div>
        <OnlineSelector />
        <div style={{ width: 45, height: 45 }}></div>
      </div>
      <OrderLocation />
      <div style={{ width: "100%", height: "100%", overflowX: "hidden", marginTop: 30 }}>
        <LineItemList />
      </div>
      <Subtotal />
      <div style={{ height: 40 }}></div>
      <div className="order-control">
        <div className="btn">Save1</div>
        <div className="btn">Pay</div>
      </div>
    </div>
  );
};

export default OrderPanel;
