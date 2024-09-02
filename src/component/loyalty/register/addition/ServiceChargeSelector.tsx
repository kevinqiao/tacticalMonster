import { ServiceCharge } from "model/RegisterModel";
import React from "react";
import { useInventoryManager } from "../context/InventoryManager";
interface Props {
  onCustom: (type: number) => void;
  onSelect: (service: ServiceCharge) => void;
}
const ServiceChargeSelector: React.FC<Props> = ({ onCustom, onSelect }) => {
  const { serviceCharges } = useInventoryManager();
  return (
    <>
      {/* <div className="discount-selector-head"></div> */}
      <div className="discount-selector-content">
        {serviceCharges.map((c) => (
          <div key={c.name + "discount"} className="discount-selector-cell" onClick={() => onSelect(c)}>
            {c.name}
          </div>
        ))}
        <div key={"custom-discount"} className="discount-selector-cell" onClick={() => onCustom(2)}>
          <span style={{ fontSize: "10px", color: "white" }}>Custom Amount Charge</span>
        </div>
        <div key={"percent-disount"} className="discount-selector-cell" onClick={() => onCustom(1)}>
          <span style={{ fontSize: "10px", color: "white" }}>Custom Percentage Charge</span>
        </div>
      </div>
    </>
  );
};

export default ServiceChargeSelector;
