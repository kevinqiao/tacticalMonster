import { Discount, DiscountPreset } from "component/loyalty/model/Order";
import React from "react";
import useLocalization from "service/LocalizationManager";
import discounts from "../../constant/discount.json";
interface Props {
  onCustom: (type: number) => void;
  onSelect: (dis: Discount) => void;
}
const DiscountSelector: React.FC<Props> = ({ onCustom, onSelect }) => {
  const { locale } = useLocalization();
  return (
    <>
      {/* <div className="discount-selector-head"></div> */}
      <div className="discount-selector-content">
        {discounts.map((c) => {
          const dis = c as DiscountPreset;
          return (
            <div key={c.name + "discount"} className="discount-selector-cell" onClick={() => onSelect(c)}>
              {dis.name[locale]}
            </div>
          );
        })}
        <div key={"custom-discount"} className="discount-selector-cell" onClick={() => onCustom(2)}>
          <span style={{ fontSize: "10px", color: "white" }}>Custom Amount Discount</span>
        </div>
        <div key={"percent-disount"} className="discount-selector-cell" onClick={() => onCustom(1)}>
          <span style={{ fontSize: "10px", color: "white" }}>Custom Percentage Discount</span>
        </div>
      </div>
    </>
  );
};

export default DiscountSelector;
