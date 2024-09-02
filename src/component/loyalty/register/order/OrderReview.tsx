import React, { useEffect, useRef, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import "../register.css";
import { PopProps } from "../RegisterHome";
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

  return (
    <div className="order-container">
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
        <div className="btn" onClick={onClose}>
          Close1
        </div>
      </div>
      <div style={{ width: "100%", height: lheight }}>
        <LineItemList />
      </div>
      <div ref={panelRef} className="order-panel">
        <Subtotal />
        <div className="order-control">
          <div
            className="btn"
            onClick={() => {
              localStorage.removeItem("cart");
            }}
          >
            Clear
          </div>
          <div className="btn">Pay</div>
        </div>
      </div>
    </div>
  );
};

export default OrderReview;
