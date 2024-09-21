import DiscountCustom from "component/loyalty/order/addition/DiscountCustom";
import { PopProps } from "component/RenderApp";
import { Discount, OrderLineItemModel } from "model/Order";
import React, { useCallback, useState } from "react";
import { useCartManager } from "../../service/CartManager";
import "./addition.css";
import DiscountSelector from "./DiscountSelector";

const DiscountPanel: React.FC<PopProps> = ({ data, onClose }) => {
  const { addDiscount, updateItem } = useCartManager();
  const [type, setType] = useState<number>(0); //0-fixed 1-custom percent 2-custom amount
  const onComplete = useCallback(
    (dis: Discount) => {
      console.log(data);
      if (!data) return;
      if (data.type === 1) {
        console.log(dis);
        addDiscount(dis);
      } else {
        const item = data.obj as OrderLineItemModel;
        item.discounts = item.discounts
          ? [...item.discounts, { ...dis, time: Date.now() }]
          : [{ ...dis, time: Date.now() }];
        updateItem(item);
      }
      if (onClose) onClose();
    },
    [data]
  );
  return (
    <>
      <div className="discount-container ">
        <div className="discount-head">
          <div className="btn" onClick={onClose}>
            X
          </div>
        </div>
        <div className="discount-content">
          {type === 0 ? (
            <DiscountSelector onCustom={(t) => setType(t)} onSelect={onComplete} />
          ) : (
            <DiscountCustom type={type} onComplete={onComplete} onCancel={() => setType(0)} />
          )}
        </div>
      </div>
    </>
  );
};

export default DiscountPanel;
