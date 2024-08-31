import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";
import { ActiveType, useCartManager } from "./context/CartManager";
import "./register.css";
const ProductHome: React.FC = () => {
  const productRef = useRef<HTMLDivElement | null>(null);
  const { visible, activeComponent, closeActive } = useCartManager();
  useEffect(() => {
    if (visible === 0) gsap.to(productRef.current, { autoAlpha: 0, duration: 0 });
  }, [visible]);
  useEffect(() => {
    console.log(activeComponent);
    if (activeComponent?.type === ActiveType.INVENTORY)
      gsap.fromTo(productRef.current, { top: "100%", autoAlpha: 1 }, { top: 0, duration: 0.7 });
    else gsap.to(productRef.current, { top: "100%", duration: 0.7 });
  }, [activeComponent]);
  return (
    <div ref={productRef} className="active-container">
      <div style={{ width: "100%", height: "100%", backgroundColor: "red" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <div className="btn" onClick={closeActive}>
            Close
          </div>
        </div>
        product Home
      </div>
    </div>
  );
};

export default ProductHome;
