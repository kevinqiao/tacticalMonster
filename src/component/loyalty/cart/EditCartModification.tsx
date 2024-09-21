import { Modification, OrderLineItemModel } from "model/Order";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { PopProps } from "component/RenderApp";
import ModifierSelector from "../category/ModifierSelector";
import { useInventoryManager } from "../service/InventoryManager";
import { useCartManager } from "../service/OrderManager";
const EditCartModification: React.FC<PopProps> = ({ data, visible, onClose }) => {
  const { updateItem } = useCartManager();
  const modificationsRef = useRef<Modification[]>([]);
  const { items } = useInventoryManager();
  // const inventoryItem: InventoryItem = data as InventoryItem;

  const inventoryItem = useMemo(() => {
    if (items && data?.inventoryId) {
      return items.find((item) => item.id === data.inventoryId);
    }
  }, [data, items]);
  useEffect(() => {
    console.log(data);
    if (visible && data) modificationsRef.current = (data as OrderLineItemModel).modifications ?? [];
  }, [visible, data]);
  const onUpdate = useCallback((modifications: Modification[]) => {
    modificationsRef.current.length = 0;
    modificationsRef.current.push(...modifications);
  }, []);
  const onModificationComplete = useCallback(() => {
    if (data) {
      const cartItem = data as OrderLineItemModel;
      cartItem.modifications = [...modificationsRef.current];
      updateItem({ ...cartItem, modifications: [...modificationsRef.current] });
      modificationsRef.current.length = 0;
      if (onClose) onClose();
    }
  }, [data, updateItem]);

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
          {inventoryItem?.name + " CA$" + inventoryItem?.price}
        </div>
        <div style={{ width: 100 }}></div>
      </div>
      {data ? (
        <ModifierSelector initial={data.modifications ?? []} inventoryId={data.inventoryId} onUpdate={onUpdate} />
      ) : null}
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

export default EditCartModification;
