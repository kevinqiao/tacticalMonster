import React from "react";
import { usePageChildManager } from "../context/PageChildManager";
import Subtotal from "../order/Subtotal";
import "../register.css";
import { POP_DATA_TYPE, PopProps } from "../RegisterHome";
const OrderBaseAdd: React.FC<PopProps> = ({ onClose, data }) => {
  const { openPop } = usePageChildManager(null, null, null);
  return (
    <>
      <div className="order-container">
        <div className="active-content">
          <div style={{ height: 60 }}></div>
          <Subtotal
            addition={true}
            onDiscountOpen={() => openPop("discount", { type: POP_DATA_TYPE.ORDER })}
            onServiceChargeOpen={() => openPop("serviceCharge", { type: POP_DATA_TYPE.ORDER })}
          />
        </div>
      </div>
    </>
  );
};

export default OrderBaseAdd;
