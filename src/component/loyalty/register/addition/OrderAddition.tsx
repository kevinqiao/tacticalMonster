import { gsap } from "gsap";
import { Discount } from "model/RegisterModel";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActiveType, useCartManager } from "../context/CartManager";
import Subtotal from "../order/Subtotal";
import "../register.css";
import DiscountPanel from "./DiscountPanel";
const OrderAddition: React.FC = () => {
  const discountRef = useRef<HTMLDivElement | null>(null);
  const { activeComponent, closeActive, addDiscount } = useCartManager();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [serviceChargeOpen, setServiceChargeOpen] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    if (activeComponent?.type === ActiveType.DISCOUNT) {
      // tl.fromTo(maskRef.current, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.7 });
      tl.fromTo(discountRef.current, { zIndex: 2000, scale: 0.7, autoAlpha: 1 }, { scale: 1.0, duration: 0.3 }, "<");
    } else {
      // tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
      tl.to(discountRef.current, { scale: 0.7, autoAlpha: 0, duration: 0.3 }, "<");
    }
    tl.play();
  }, [activeComponent]);
  const onDiscountSelect = useCallback((dis: Discount) => {
    console.log(dis);
    addDiscount(dis);
    setDiscountOpen(false);
  }, []);

  return (
    <>
      <div ref={discountRef} className="active-container">
        <div className="active-content">
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <div className="btn" onClick={closeActive}>
              Close
            </div>
          </div>
          <Subtotal
            addition={true}
            onDiscountOpen={() => setDiscountOpen(true)}
            onServiceChargeOpen={() => setServiceChargeOpen(true)}
          />
        </div>
      </div>
      <DiscountPanel open={discountOpen} onClose={() => setDiscountOpen(false)} onComplete={onDiscountSelect} />
    </>
  );
};

export default OrderAddition;
