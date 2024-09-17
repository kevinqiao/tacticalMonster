import React from "react";
import { usePageManager } from "service/PageManager";
import Subtotal from "../order/Subtotal";
import "../register.css";
import { PopProps } from "../RegisterHome";
const OrderBaseAdd: React.FC<PopProps> = ({ onClose, data }) => {
  const { openChild } = usePageManager();
  return (
    <>
      <div className="order-container">
        <div className="active-content">
          <div style={{ height: 60 }}></div>
          <Subtotal
            addition={true}
            onDiscountOpen={() => openChild("discount", { type: 1 })}
            onServiceChargeOpen={() => openChild("serviceCharge", { type: 1 })}
          />
        </div>
      </div>
    </>
  );
};

export default OrderBaseAdd;
