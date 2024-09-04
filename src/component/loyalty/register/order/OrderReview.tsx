import React, { useEffect, useRef, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import { useCartManager } from "../context/CartManager";
import "../register.css";
import { PopProps } from "../RegisterHome";
import LineItemList from "./LineItemList";
import "./order.css";
import Subtotal from "./Subtotal";
const OrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { height } = useTerminal();
  const [lheight, setLheight] = useState(0);
  const { clear } = useCartManager();
  useEffect(() => {
    if (panelRef.current) {
      const height = window.innerHeight - panelRef.current.clientHeight;
      setLheight(height);
    }
  }, [height]);

  return (
    <div className="order-container">
      <div style={{ height: 80, width: "100%", backgroundColor: "red", marginBottom: 10 }}>Order Basic Info</div>
      <div style={{ width: "100%", height: lheight }}>
        <LineItemList />
      </div>
      <div ref={panelRef} className="order-panel">
        <Subtotal />
        <div className="order-control">
          <div className="btn" onClick={() => clear()}>
            Clear
          </div>
          <div className="btn">Pay</div>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;
