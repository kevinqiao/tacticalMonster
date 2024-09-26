import { gsap } from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { useInventoryManager } from "../service/InventoryManager";
import { useCartManager } from "../service/OrderManager";
import "./order.css";

const OrderBar: React.FC = () => {
  const addRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const { lastItemAdded, setLastItemAdded, clear } = useCartManager();

  const { openChild } = usePageManager();
  // const { openPop } = usePageChildManager(null, null, null);
  useEffect(() => {
    if (lastItemAdded) {
      const tl = gsap.timeline({
        onComplete: () => {
          setLastItemAdded(null);
          tl.kill();
        },
      });
      tl.to(addRef.current, { autoAlpha: 1, duration: 0.7 });
      tl.to(addRef.current, { autoAlpha: 0, duration: 0.7 }, ">=+1.2");
      tl.play();
    }
  }, [lastItemAdded]);
  const addedName = useMemo(() => {
    if (items && lastItemAdded) {
      const item = items.find((c) => c.id === lastItemAdded.inventoryId);
      return item?.name;
    }
  }, [lastItemAdded, items]);

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
      <div className="order-bar">
        {/* <div className="cartbar-container"> */}
        <div className="orderbar-left" onClick={clear}></div>
        <div className="orderbar-right">
          <div className="btn" style={{ width: 120 }} onClick={() => openChild("orderReview")}>
            Review Order
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderBar;
