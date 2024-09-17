import { Discount, OrderLineItemModel } from "model/RegisterModel";
import React, { useCallback } from "react";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";

import { usePageManager } from "service/PageManager";
import "./order.css";
const LineItemList: React.FC = () => {
  const { openChild } = usePageManager();
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
          const citem = items.find((item) => item.id === c.inventoryId);
          return (
            <div key={c.id} className="lineItem-container" onClick={() => openChild("orderItem", { type: 2, obj: c })}>
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
    </>
  );
};

export default LineItemList;
