import { useOrderManager } from "component/loyalty/service/OrderManager";
import { PopProps } from "component/RenderApp";
import { ServiceCharge } from "model/Order";
import React, { useCallback, useState } from "react";
import "./addition.css";
import ServiceChargeCustom from "./ServiceChargeCustom";
import ServiceChargeSelector from "./ServiceChargeSelector";

const ServiceChargePanel: React.FC<PopProps> = ({ data, onClose }) => {
  const [type, setType] = useState<number>(0); //0-fixed 1-custom percent 2-custom amount
  const { addServiceCharge } = useOrderManager();
  const onComplete = useCallback(
    (service: ServiceCharge) => {
      addServiceCharge(service);
      if (onClose) onClose();
    },
    [addServiceCharge]
  );
  return (
    <>
      <div className="discount-panel">
        <div className="discount-container ">
          <div className="discount-head">
            <div className="btn" onClick={onClose}>
              X
            </div>
          </div>
          <div className="discount-content">
            {type === 0 ? (
              <ServiceChargeSelector onCustom={(t) => setType(t)} onSelect={onComplete} />
            ) : (
              <ServiceChargeCustom type={type} onComplete={onComplete} onCancel={() => setType(0)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceChargePanel;
