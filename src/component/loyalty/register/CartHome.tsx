import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";
import { ActiveType, useCartManager } from "./context/CartManager";
import { useInventoryManager } from "./context/InventoryManager";
import Subtotal from "./order/Subtotal";
import "./register.css";
const CartHome: React.FC = () => {
  const cartRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const { cart, visible, activeComponent, closeActive } = useCartManager();
  useEffect(() => {
    console.log("visible in cart:" + visible);
    if (visible === 0) gsap.to(cartRef.current, { autoAlpha: 0, duration: 0 });
  }, [visible]);
  useEffect(() => {
    if (activeComponent?.type === ActiveType.ORDER)
      gsap.fromTo(cartRef.current, { top: "100%", autoAlpha: 1 }, { top: 0, duration: 0.7 });
    else gsap.to(cartRef.current, { top: "100%", duration: 0.7 });
  }, [activeComponent]);

  return (
    <div ref={cartRef} className="active-container">
      <div style={{ width: "100%", height: "100%", backgroundColor: "red" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <div className="btn" onClick={closeActive}>
            Close1
          </div>
        </div>
        {cart?.lineItems.map((c) => {
          const citem = items.find((item) => item.id === c.id);
          return (
            <div key={c.id} className="lineItem-container">
              <div className="lineItem-cell">{citem?.name}</div>
              <div className="lineItem-cell">{c.quantity}</div>
              <div className="lineItem-cell">{c.price}</div>
            </div>
          );
        })}
        <Subtotal />
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <div
            className="btn"
            onClick={() => {
              localStorage.removeItem("cart");
            }}
          >
            Clear
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartHome;
