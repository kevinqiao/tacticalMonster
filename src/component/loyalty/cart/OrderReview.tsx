import { PopProps } from "component/RenderApp";
import { OrderLineItemModel } from "model/Order";
import React, { useMemo } from "react";
import "../merchant/register/register.css";
import { useInventoryManager } from "../service/InventoryManager";
import { useOrderManager } from "../service/OrderManager";
import "./cart.css";
const OrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  const { order } = useOrderManager();
  const { items: citems } = useInventoryManager();
  const groups: { [k: number]: OrderLineItemModel[] } = useMemo(() => {
    const grps: { [k: number]: OrderLineItemModel[] } = {};
    order?.lineItems.forEach((item) => {
      if (item.groupId) {
        const grp = grps[item.groupId];
        if (grp) grp.push(item);
        else grps[item.groupId] = [item];
      }
    });
    return grps;
  }, [order]);
  console.log(order);
  console.log(groups);
  return (
    <div className="cart-container">
      <div style={{ height: 80, width: "100%", backgroundColor: "red", marginBottom: 10 }}>Shopping Cart</div>
      <div>
        {Object.keys(groups).map((k, index) => (
          <div key={"grp" + k + ""} style={{ width: "100%", marginTop: 20 }}>
            <div>{k}</div>
            {groups[Number(k)]?.map((item, index) => {
              const citem = citems.find((citem) => citem.id === item.inventoryId);
              if (citem)
                return (
                  <div key={item.id} className="lineItem-row">
                    <div className="lineItem-cell">{citem?.name}</div>
                    <div className="lineItem-cell">{item.quantity + "x" + item.price}</div>
                    <div className="lineItem-cell">{(item.quantity * item.price).toFixed(2)}</div>
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

export default OrderReview;
