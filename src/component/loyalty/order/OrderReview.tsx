import { PopProps } from "component/RenderApp";
import React, { useEffect, useRef, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import "../merchant/register/register.css";
import LineItemList from "./LineItemList";
import "./order.css";
import Subtotal from "./Subtotal";
const OrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { height } = useTerminal();
  const [lheight, setLheight] = useState(0);

  useEffect(() => {
    if (panelRef.current) {
      const height = window.innerHeight - panelRef.current.clientHeight;
      setLheight(height);
    }
  }, [height]);
  console.log(height);
  return (
    <div className="order-container">
      <div style={{ height: 80, width: "100%", backgroundColor: "red", marginBottom: 10 }}>Order Basic Info</div>
      <div style={{ width: "100%", height: lheight }}>
        <LineItemList />
      </div>
      <div ref={panelRef} className="order-panel">
        <Subtotal />
        <div className="order-control">
          <div className="btn">Clear</div>
          <div className="btn">Pay</div>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;
