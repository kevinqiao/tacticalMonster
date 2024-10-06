import { PopProps } from "component/RenderApp";
import { OrderLineItemModel } from "component/loyalty/model/Order";
import React, { useMemo } from "react";
import "../merchant/register/register.css";
import { useInventoryManager } from "../service/InventoryManager";
import { useOrderManager } from "../service/OrderManager";
import "./cart.css";
const CartOrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  const { order } = useOrderManager();
  const { items: citems, combos } = useInventoryManager();
  console.log(order);
  const groups: { [k: number]: OrderLineItemModel[] } = useMemo(() => {
    const grps: { [k: number]: OrderLineItemModel[] } = {};
    order?.lineItems.forEach((item) => {
      if (item.hash) {
        const grp = grps[item.hash];
        if (grp) grp.push(item);
        else grps[item.hash] = [item];
      }
    });
    return grps;
  }, [order]);
  console.log(groups);
  return (
    <div className="cart-container">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 80,
          width: "100%",
          backgroundColor: "red",
          marginBottom: 10,
        }}
      >
        All Submit
      </div>
      <div>
        {Object.keys(groups).map((k, index) => (
          <div key={"group-" + index + ""} style={{ width: "100%", marginTop: 20 }}>
            <div>{k}</div>
            {groups[Number(k)]?.map((c: OrderLineItemModel, index) => {
              let name = null;
              let comboItems = null;
              if (c.combo) {
                const comboId = c.combo.id;
                const combo = combos.find((combo) => comboId === combo.id);
                if (combo) {
                  name = combo.name;
                  comboItems = c.combo?.items.map((item) => {
                    const inventoryItem = citems.find((c) => c.id === item.inventoryId);
                    return { ...item, name: inventoryItem?.name };
                  });
                }
              } else {
                const citem = citems.find((citem) => citem.id === c.inventoryId);
                name = citem?.name;
              }

              return (
                <div key={c.id} style={{ width: "100%" }}>
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
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="cart-control">
        <div className="btn" onClick={onClose}>
          Close
        </div>
      </div>
    </div>
  );
};

export default CartOrderReview;
