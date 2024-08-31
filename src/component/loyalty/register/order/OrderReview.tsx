import { gsap } from "gsap";
import React, { useEffect, useRef, useState } from "react";
import { ActiveType, useCartManager } from "../context/CartManager";
import "../register.css";
import LineItemList from "./LineItemList";
import "./order.css";
import Subtotal from "./Subtotal";
const OrderReview: React.FC = () => {
  const cartRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const { visible, activeComponent, closeActive } = useCartManager();
  useEffect(() => {
    if (panelRef.current) {
      const height = window.innerHeight - panelRef.current.clientHeight;
      setHeight(height);
    }
  }, []);
  useEffect(() => {
    console.log("visible in cart:" + visible);
    if (visible === 0) gsap.to(cartRef.current, { autoAlpha: 0, duration: 0 });
  }, [visible]);
  useEffect(() => {
    if (activeComponent?.type === ActiveType.ORDER)
      gsap.fromTo(cartRef.current, { top: "100%", autoAlpha: 1 }, { top: 0, duration: 0.3 });
    else gsap.to(cartRef.current, { top: "100%", duration: 0.3 });
  }, [activeComponent]);

  return (
    <div ref={cartRef} className="active-container">
      <div className="order-container">
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <div className="btn" onClick={closeActive}>
            Close1
          </div>
        </div>
        <div style={{ width: "100%", height }}>
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
    </div>
  );
};

export default OrderReview;
