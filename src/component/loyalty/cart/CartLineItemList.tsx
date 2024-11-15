import { Discount, DiscountPreset, OrderLineItemModel } from "component/loyalty/model/Order";
import React, { useCallback } from "react";
import { useInventoryManager } from "../service/InventoryManager";

import useLocalization from "service/LocalizationManager";
import { usePageManager } from "service/PageManager";
import discounts from "../constant/discount.json";
import { useCartManager } from "../service/OrderManager";
import "./cart.css";
const CartLineItemList: React.FC = () => {
  const { locale } = useLocalization();
  const { openChild } = usePageManager();
  const { cart } = useCartManager();
  const { items, combos } = useInventoryManager();

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
          let name = "";
          let comboItems = null;
          const comboId = c.combo?.id;
          if (comboId) {
            const combo = combos.find((combo) => comboId === combo.id);
            if (combo) {
              name = combo.name;
              comboItems = c.combo?.items.map((item) => {
                const inventoryItem = items.find((c) => c.id === item.inventoryId);
                return { ...item, name: inventoryItem?.name };
              });
            }
          } else {
            const citem = items.find((item) => item.id === c.inventoryId);
            name = citem ? citem.name : "";
          }
          return (
            <div key={c.id} className="lineItem-container" onClick={() => openChild("cartItem", { type: 2, obj: c })}>
              <div className="lineItem-row">
                <div className="lineItem-cell">{name}</div>
                <div className="lineItem-cell">{c.quantity + "x" + c.price}</div>
                <div className="lineItem-cell">{(c.quantity * c.price).toFixed(2)}</div>
              </div>

              {comboItems?.map((c) => (
                <div key={c.inventoryId} className="comboItem-container">
                  <div className="combo-item-title">{c.name}</div>
                  <div className="lineItem-cell">{c.quantity ?? 1}</div>
                  <div className="lineItem-cell">{c.price ?? "0.0"}</div>
                </div>
              ))}

              {c.discounts?.map((dis) => {
                const discount: DiscountPreset | undefined = discounts.find((d) => d.id === dis.id);
                const name = discount ? discount.name[locale] : null;
                return (
                  <div key={dis.time} className="lineItem-row">
                    <div className="lineItem-cell"></div>
                    <div className="lineItem-cell">{name}</div>
                    <div className="lineItem-cell">{discountAmount(dis, c)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CartLineItemList;
