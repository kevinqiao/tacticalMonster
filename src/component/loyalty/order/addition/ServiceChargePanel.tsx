import { ServiceCharge } from "model/Order";
import React, { useCallback, useState } from "react";
import { PopProps } from "../../merchant/register/RegisterHome";
import { useCartManager } from "../../service/CartManager";
import "./addition.css";
import ServiceChargeCustom from "./ServiceChargeCustom";
import ServiceChargeSelector from "./ServiceChargeSelector";
interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (service: ServiceCharge) => void;
}
const ServiceChargePanel: React.FC<PopProps> = ({ data, onClose }) => {
  const [type, setType] = useState<number>(0); //0-fixed 1-custom percent 2-custom amount
  const { addServiceCharge } = useCartManager();
  const onComplete = useCallback(
    (service: ServiceCharge) => {
      addServiceCharge(service);
      if (onClose) onClose();
    },
    [addServiceCharge]
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
            <ServiceChargeSelector onCustom={(t) => setType(t)} onSelect={onComplete} />
          ) : (
            <ServiceChargeCustom type={type} onComplete={onComplete} onCancel={() => setType(0)} />
          )}
        </div>
      </div>
    </>
  );
};

export default ServiceChargePanel;
