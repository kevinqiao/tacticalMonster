import { gsap } from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";
import "../register.css";

const CartBar: React.FC = () => {
  const addRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const { lastItemAdded } = useCartManager();
  const { currentPage, openPage } = usePageManager();
  // const { openPop } = usePageChildManager(null, null, null);
  useEffect(() => {
    console.log(lastItemAdded);
    if (!lastItemAdded) return;
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(addRef.current, { autoAlpha: 1, duration: 0.7 });
    tl.to(addRef.current, { autoAlpha: 0, duration: 0.7 }, ">=+1.2");
    tl.play();
  }, [lastItemAdded]);
  const addedName = useMemo(() => {
    if (items && lastItemAdded) {
      const item = items.find((c) => c.id === lastItemAdded.id);
      return item?.name;
    }
  }, [lastItemAdded, items]);
  const openReview = useCallback(() => {
    if (currentPage) openPage({ app: currentPage.app, name: currentPage.name, child: "orderReview" });
  }, [openPage, currentPage]);
  return (
    <>
      <div ref={addRef} className="cartadd-container">
        {lastItemAdded ? (
          <>
            <div className="lineItem-cell">{lastItemAdded.id}</div>
            <div>{addedName}</div>
            <div>{lastItemAdded.price}</div>
          </>
        ) : null}
      </div>
      <div className="cartbar-container">
        <div className="cartbar-left"></div>
        <div className="cartbar-right">
          <div className="btn" style={{ width: 120 }} onClick={openReview}>
            Review Order
          </div>
        </div>
      </div>
    </>
  );
};

export default CartBar;
