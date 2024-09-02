import { Discount, OrderLineItemModel } from "model/RegisterModel";
import React, { useCallback } from "react";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";
import { usePopManager } from "../context/PopManager";
import { POP_DATA_TYPE } from "../RegisterHome";
import "./order.css";
const LineItemList: React.FC = () => {
  const { openPop } = usePopManager(null, null, null);
  const { cart } = useCartManager();
  const { items, discounts } = useInventoryManager();

  const discountName = useCallback(
    (dis: Discount) => {
      if (discounts) {
        const discount = discounts.find((d) => d.id === dis.id);
        return discount?.name;
      }
    },
    [discounts]
  );
  const discountAmount = useCallback(
    (dis: Discount, item: OrderLineItemModel) => {
      const subtotal = item.price * item.quantity;
      const amount = dis.amount ?? (dis.percent ? dis.percent * subtotal : 0);
      return (0 - amount).toFixed(2);
    },
    [cart]
  );

  return (
    <>
      <div className="order-content">
        {cart?.lineItems.map((c) => {
          console.log(c);
          const citem = items.find((item) => item.id === c.id);
          return (
            <div
              key={c.id}
              className="lineItem-container"
              onClick={() => openPop("orderItem", { type: POP_DATA_TYPE.ORDER_ITEM, obj: c })}
            >
              <div className="lineItem-row">
                <div className="lineItem-cell">{citem?.name}</div>
                <div className="lineItem-cell">{c.quantity + "x" + c.price}</div>
                <div className="lineItem-cell">{(c.quantity * c.price).toFixed(2)}</div>
              </div>
              {c.discounts?.map((dis) => (
                <div key={dis.time} className="lineItem-row">
                  <div className="lineItem-cell"></div>
                  <div className="lineItem-cell">{discountName(dis)}</div>
                  <div className="lineItem-cell">{discountAmount(dis, c)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {/* <OrderItem itemId={activeId} onClose={() => setActiveId(null)} /> */}
    </>
  );
};

export default LineItemList;
