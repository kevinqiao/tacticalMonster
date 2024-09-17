import { InventoryItem, Modification, OrderLineItemModel } from "model/RegisterModel";
import React, { useCallback, useEffect, useRef } from "react";
import { useCartManager } from "../context/CartManager";

import { PopProps } from "component/RenderApp";
import "./order.css";
import OrderModifier from "./OrderModifier";
const AddOrderItem: React.FC<PopProps> = ({ data, visible, onClose }) => {
  const { cart, addItem, updateItem } = useCartManager();
  const modificationsRef = useRef<Modification[]>([]);
  const inventoryItem: InventoryItem = data as InventoryItem;
  useEffect(() => {
    if (visible) modificationsRef.current.length = 0;
  }, [visible]);
  const onUpdate = useCallback(
    (modifications: Modification[]) => {
      modificationsRef.current.length = 0;
      modificationsRef.current.push(...modifications);
    },
    [updateItem]
  );
  const updateCart = useCallback(() => {
    if (cart) {
      let orderItem: OrderLineItemModel | null = null;
      const orderItems = cart.lineItems.filter((c) => c.inventoryId === inventoryItem.id);
      for (const item of orderItems) {
        if (item.modifications?.length === modificationsRef.current.length) {
          let modiEqual = true;
          for (const mod of modificationsRef.current) {
            const modi = item.modifications.find((m) => {
              return m.id === mod.id && m.quantity === mod.quantity ? true : false;
            });
            if (!modi) {
              modiEqual = false;
              break;
            }
          }
          if (modiEqual) orderItem = item;
        }
      }
      
      if (orderItem) {
        orderItem.quantity++;
        updateItem(orderItem);
      } else {
        addItem({
          id: Date.now() + "",
          quantity: 1,
          inventoryId: inventoryItem.id,
          price: inventoryItem.price,
          modifications: [...modificationsRef.current],
        });
      }
      modificationsRef.current.length = 0;
      if (onClose) onClose();
    }
  }, [cart]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "white" }}>
      <div className="inventory-price">
        <div style={{ width: 100 }}></div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
            color: "white",
          }}
        >
          {inventoryItem.name + " CA$" + inventoryItem.price}
        </div>
        <div style={{ width: 100 }}></div>
      </div>
      {/* <div className="inventory-desc"></div> */}
      {visible ? <OrderModifier initial={[]} inventoryId={inventoryItem.id} onUpdate={onUpdate} /> : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
        }}
      >
        <div className="btn" style={{ height: 40, color: "blue" }} onClick={onClose}>
          Cancel
        </div>
        <div className="btn" style={{ color: "blue" }} onClick={updateCart}>
          Done
        </div>
      </div>
    </div>
  );
};

export default AddOrderItem;
