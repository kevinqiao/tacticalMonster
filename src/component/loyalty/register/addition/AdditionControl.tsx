import { gsap } from "gsap";
import React, { useCallback, useRef } from "react";
import { ActiveType, useCartManager } from "../context/CartManager";
import "../register.css";
const AdditionHome: React.FC = () => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { openActive } = useCartManager();
  const openMenu = useCallback(() => {
    console.log("open menu");
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.6 });
    tl.fromTo(menuRef.current, { autoAlpha: 1, right: "-30%" }, { right: 0, duration: 0.6 }, "<");
    tl.play();
  }, []);
  const closeMenu = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 });
    tl.fromTo(menuRef.current, { autoAlpha: 1, right: 0 }, { right: "-30%", duration: 0.6 }, "<");
    tl.play();
  }, []);
  const doAction = useCallback(() => {
    closeMenu();
    openActive({ type: ActiveType.DISCOUNT, model: null });
  }, []);
  return (
    <>
      <div ref={maskRef} className="mask" onClick={closeMenu}></div>
      <div className="addition-btn-container" onClick={openMenu}>
        <div className="btn">
          <span style={{ fontSize: "10px" }}>More</span>
        </div>
      </div>
      <div ref={menuRef} className="addition-menu">
        <div className="addition-menu-item" onClick={doAction}>
          Order Discount
        </div>
        <div className="addition-menu-item">Menu2</div>
        <div className="addition-menu-item">Menu3</div>
        <div className="addition-menu-item">Menu4</div>
        <div className="addition-menu-item">Menu5</div>
      </div>
    </>
  );
};

export default AdditionHome;
