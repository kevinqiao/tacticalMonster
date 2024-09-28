import { gsap } from "gsap";
import React, { useCallback, useRef } from "react";
import { usePageManager } from "service/PageManager";
import "./addition.css";
const AdditionControl: React.FC = () => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { openChild } = usePageManager();
  const openMenu = useCallback(() => {
    console.log("open menu");
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.fromTo(maskRef.current, { autoAlpha: 0 }, { autoAlpha: 0.6, duration: 0.5 });
    tl.fromTo(menuRef.current, { x: "100%", autoAlpha: 1 }, { x: 0, duration: 0.5 }, "<");
    tl.play();
  }, []);
  const closeMenu = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
    tl.to(menuRef.current, { x: "100%", duration: 0.3 }, "<");
    tl.play();
  }, []);
  const doAction = useCallback(() => {
    closeMenu();
    openChild("orderAddition", {});
  }, []);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", width: 140 }}>
        <div className="more-btn-container" onClick={openMenu}>
          <div className="btn">
            <span style={{ fontSize: "10px" }}>More</span>
          </div>
        </div>
      </div>
      <div ref={maskRef} className="amask" onClick={closeMenu}></div>
      <div ref={menuRef} className="more-menu">
        <div className="more-menu-item" onClick={doAction}>
          Order Discount
        </div>
        <div className="more-menu-item">Menu2</div>
        <div className="more-menu-item">Menu3</div>
        <div className="more-menu-item">Menu4</div>
        <div className="more-menu-item">Menu5</div>
        <div className="more-menu-item" onClick={closeMenu}>
          close
        </div>
      </div>
    </>
  );
};

export default AdditionControl;
