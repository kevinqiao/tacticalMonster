import { InventoryItem, Modification } from "model/Order";
import React, { useCallback, useEffect, useRef } from "react";

import { PopProps } from "component/RenderApp";
import { useOrderManager } from "../service/OrderManager";
import "./order.css";
import OrderModifier from "./OrderModifier";
const AddCartItem: React.FC<PopProps> = ({ data, visible, onClose }) => {
  const { order, addOrderItem, updateItem } = useOrderManager();
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
  const onModificationComplete = useCallback(() => {
    if (order) {
      addOrderItem(inventoryItem, [...modificationsRef.current]);
      modificationsRef.current.length = 0;
      if (onClose) onClose();
    }
  }, [order]);
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
        <div className="btn" style={{ color: "blue" }} onClick={onModificationComplete}>
          Done
        </div>
      </div>
    </div>
  );
};

export default AddCartItem;
