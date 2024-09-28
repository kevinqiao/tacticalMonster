import { gsap } from "gsap";
import React, { useEffect, useMemo, useRef } from "react";
import { usePageManager } from "service/PageManager";
import "../merchant/register/register.css";
import { useInventoryManager } from "../service/InventoryManager";
import { useCartManager } from "../service/OrderManager";
import "./cart.css";
const CartBar: React.FC = () => {
  const addRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const { lastItemAdded, setLastItemAdded } = useCartManager();

  const { openChild } = usePageManager();
  // const { openPop } = usePageChildManager(null, null, null);
  useEffect(() => {
    if (lastItemAdded) {
      console.log(lastItemAdded);
      const tl = gsap.timeline({
        onComplete: () => {
          // setLastItemAdded(null);
          tl.kill();
        },
      });
      tl.fromTo(addRef.current, { y: 0, autoAlpha: 1 }, { y: -100, duration: 0.6 });
      tl.to(addRef.current, { autoAlpha: 0, duration: 0.7 }, ">=+1.2");
      tl.play();
    }
  }, [lastItemAdded, setLastItemAdded]);
  const addedName = useMemo(() => {
    if (items && lastItemAdded) {
      const item = items.find((c) => c.id === lastItemAdded.inventoryId);
      return item?.name;
    }
  }, [lastItemAdded, items]);
  console.log(addedName);
  return (
    <div style={{ position: "relative", height: "60px", width: "100%", color: "black" }}>
      <div ref={addRef} className="add-container">
        {lastItemAdded ? (
          <>
            <div>{lastItemAdded.id}</div>
            <div>{addedName}</div>
            <div>{lastItemAdded.price}</div>
          </>
        ) : null}
      </div>

      <div className="bar-container">
        <div className="cartbar-left" onClick={() => openChild("cartbox")}></div>
        <div className="cartbar-right">
          <div className="btn" style={{ width: 120 }} onClick={() => openChild("cartReview")}>
            Check1 Out
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartBar;
