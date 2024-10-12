import { OrderLineItemModel } from "component/loyalty/model/Order";
import { gsap } from "gsap";
import React, { useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { useInventoryManager } from "../service/InventoryManager";
import { useOrderManager } from "../service/OrderManager";
import "./order.css";

const OrderBar: React.FC = () => {
  const addRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const { clear } = useOrderManager();
  const { event } = useEventSubscriber(["orderItemAdded"], ["order"]);
  const [lastItemAdded, setLastItemAdded] = useState<OrderLineItemModel | null>(null);
  const { openChild } = usePageManager();
  console.log(lastItemAdded);
  useEffect(() => {
    if (event) {
      setLastItemAdded(event.data);
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      tl.fromTo(addRef.current, { y: 0, autoAlpha: 1 }, { y: -100, duration: 0.6 });
      tl.to(addRef.current, { autoAlpha: 0, duration: 0.7 }, ">=+1.2");
      tl.play();
    }
  }, [event]);
  const addedName = useMemo(() => {
    if (items && lastItemAdded) {
      const item = items.find((c) => c.id === lastItemAdded.inventoryId);
      return item?.name;
    }
  }, [lastItemAdded, items]);

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: "60px", width: "100%", color: "black" }}>
      <div ref={addRef} className="add-notice">
        {lastItemAdded ? (
          <>
            <div>{lastItemAdded.id}</div>
            <div>{addedName}</div>
            <div>{lastItemAdded.price}</div>
          </>
        ) : null}
      </div>
      <div className="order-bar">
        <div className="orderbar-left" onClick={clear}></div>
        <div className="orderbar-right">
          <div className="btn" style={{ width: 120 }} onClick={() => openChild("orderReview")}>
            Review Order
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBar;