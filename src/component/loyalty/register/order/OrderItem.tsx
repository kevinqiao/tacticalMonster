import { Discount, OrderLineItemModel } from "model/RegisterModel";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";

import { PopProps } from "component/RenderApp";
import "./order.css";

const OrderItem: React.FC<PopProps> = ({ data, onClose }) => {
  const { cart, updateItem } = useCartManager();
  const { openChild } = usePageManager();
  const { discounts, modifiers } = useInventoryManager();
  const [item, setItem] = useState<OrderLineItemModel | null>(null);
  useEffect(() => {
    console.log(data);
    if (cart && data?.obj.id) {
      const activeItem = cart?.lineItems.find((item, index) => item.id === data.obj.id);
      if (activeItem && activeItem !== item) setItem(activeItem);
    }
  }, [data, cart]);
  const modifierName = useCallback(
    (mid: string) => {
      const modifier = modifiers.find((m) => m.id === mid);
      return modifier?.name;
    },
    [modifiers]
  );
  const subtotal = useMemo(() => {
    if (item) {
      const sub = item?.quantity * item?.price;
      return sub.toFixed(2);
    }
  }, [cart, item]);

  const discount = useCallback(
    (dis: Discount) => {
      console.log(dis);
      if (subtotal) {
        const amount = dis.amount ?? (dis.percent ? Number(dis.percent * Number(subtotal)).toFixed(2) : 0);
        return +amount;
      }
      return 0;
    },
    [subtotal]
  );
  const total = useMemo(() => {
    if (subtotal && item) {
      let tot = +subtotal;
      if (item.modifications) {
        const modis = item.modifications.reduce((t, dis) => {
          return t + dis.price * dis.quantity;
        }, 0);
        tot = tot + modis;
      }
      if (item.discounts) {
        const discounts = item.discounts.reduce((t, dis) => {
          return t + (dis.amount ?? (dis.percent ? dis.percent * tot : 0));
        }, 0);
        tot = tot - discounts;
      }
      return tot;
    }
  }, [subtotal, item]);

  const discountTitle = useCallback(
    (dis: Discount) => {
      if (dis.id === "####") {
        return "discount";
      } else {
        const discount = discounts.find((d) => d.id === dis.id);
        return discount?.name;
      }
    },
    [discounts]
  );
  const increment = useCallback(
    (incr: number) => {
      if (item) {
        item.quantity = item.quantity + incr;
        updateItem(item);
      }
    },
    [updateItem, item]
  );
  const removeDiscount = useCallback(
    (dis: Discount) => {
      if (item?.discounts) {
        item.discounts = item.discounts.filter((d) => d.time !== dis.time);
        updateItem(item);
      }
    },
    [item]
  );
  const modifierTotal = useMemo(() => {
    if (item?.modifications) {
      const mtotal = item.modifications.reduce((t, p) => (t = t + p.price), 0);
      return +mtotal.toFixed(2);
    }
    return 0;
  }, [item]);
  return (
    <>
      <div className="orderItem-container">
        <div style={{ height: 50 }} />
        {/* <div id="modifier-content">
          {item?.modifications?.map((m) => (
            <div key={m.id}>
              {modifierName(m.id)}
              {m.quantity}
              {m.price}
            </div>
          ))}
        </div> */}
        {modifierTotal > 0 ? (
          <div className="item-part">
            <div className="item-row">
              <span>Modifiers</span>
              <span>{modifierTotal.toFixed(2)}</span>
            </div>
          </div>
        ) : null}
        <div className="item-part">
          <div className="item-row">
            <span>Price</span>
            <span>{item?.price}</span>
          </div>
          <div className="item-row">
            <span>Quantity</span>
            <div className="quantity">
              <div className="quantity-incr" onClick={() => increment(-1)}>
                -
              </div>
              <div style={{ fontSize: "18px" }}>{item?.quantity}</div>
              <div className="quantity-incr" onClick={() => increment(1)}>
                +
              </div>
            </div>
          </div>
          <div className="item-row">
            <span>Subtotal</span>
            <span>{subtotal}</span>
          </div>
        </div>
        <div className="item-part">
          {item?.discounts &&
            item.discounts.map((dis, index) => (
              <div key={dis.id + "-" + index} className="item-row">
                <div className="subtotal-item-cell">{discountTitle(dis)}</div>
                <div className="subtotal-item-cell">
                  <div className="subtotal-item-delete" onClick={() => removeDiscount(dis)}>
                    X
                  </div>
                </div>
                <div className="subtotal-item-cell">{Number(0 - discount(dis)).toFixed(2)}</div>
              </div>
            ))}
          <div className="item-row" onClick={() => openChild("discount", { type: 2, obj: item })}>
            <div style={{ fontSize: 18, color: "blue" }}>Add DISCOUNT</div>
            <div></div>
          </div>
        </div>
        <div className="item-part">
          <div className="item-row">
            <span>Total</span>
            <span>{total}</span>
          </div>
        </div>
        <div className="orderItem-done">
          {/* <div className="btn" style={{ color: "blue" }} onClick={onClose}>
            Cancel
          </div> */}
          <div className="btn" style={{ color: "blue" }} onClick={onClose}>
            Done
          </div>
        </div>
      </div>
      {/* <DiscountPanel open={discountOpen} onClose={() => setDiscountOpen(false)} onComplete={onDiscountSelect} /> */}
    </>
  );
};

export default OrderItem;
