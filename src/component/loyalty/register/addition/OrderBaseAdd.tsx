import React from "react";
import { usePopManager } from "../context/PopManager";
import Subtotal from "../order/Subtotal";
import "../register.css";
import { POP_DATA_TYPE, PopProps } from "../RegisterHome";
const OrderBaseAdd: React.FC<PopProps> = ({ onClose, data }) => {
  const { openPop } = usePopManager(null, null, null);
  return (
    <>
      <div className="order-container">
        <div className="active-content">
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <div className="btn" onClick={onClose}>
              Close
            </div>
          </div>
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
