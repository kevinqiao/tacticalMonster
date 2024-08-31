import { Discount, OrderLineItemModel } from "model/RegisterModel";
import React, { useCallback, useState } from "react";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";
import "./order.css";
import OrderItem from "./OrderItem";
const LineItemList: React.FC = () => {
  const { cart } = useCartManager();
  const { items, discounts } = useInventoryManager();
  const [activeId, setActiveId] = useState<string | null>(null);

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
      return -amount.toFixed(2);
    },
    [cart]
  );

  return (
    <>
      <div className="order-content">
        {cart?.lineItems.map((c) => {
          const citem = items.find((item) => item.id === c.id);
          return (
            <div key={c.id} className="lineItem-container" onClick={() => setActiveId(c.id)}>
              <div className="lineItem-row">
                <div className="lineItem-cell">{citem?.name}</div>
                <div className="lineItem-cell">{c.quantity}</div>
                <div className="lineItem-cell">{c.price}</div>
              </div>
              {c.discounts?.map((dis) => (
                <div key={dis.id} className="lineItem-row">
                  <div className="lineItem-cell"></div>
                  <div className="lineItem-cell">{discountName(dis)}</div>
                  <div className="lineItem-cell">{discountAmount(dis, c)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <OrderItem itemId={activeId} onClose={() => setActiveId(null)} />
    </>
  );
};

export default LineItemList;
