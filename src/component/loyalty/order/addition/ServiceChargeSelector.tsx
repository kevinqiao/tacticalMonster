import { ServiceCharge, ServiceChargePreset } from "component/loyalty/model/Order";
import React from "react";
import useLocalization from "service/LocalizationManager";
import serviceCharges from "../../constant/service_charge.json";
interface Props {
  onCustom: (type: number) => void;
  onSelect: (service: ServiceCharge) => void;
}
const ServiceChargeSelector: React.FC<Props> = ({ onCustom, onSelect }) => {
  const { locale } = useLocalization();
  return (
    <>
      {/* <div className="discount-selector-head"></div> */}
      <div className="discount-selector-content">
        {serviceCharges.map((c) => {
          const name = (c as ServiceChargePreset).name[locale];
          return (
            <div key={c.name + "discount"} className="discount-selector-cell" onClick={() => onSelect(c)}>
              {name}
            </div>
          );
        })}
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
