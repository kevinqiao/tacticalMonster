import { CountryCode } from "libphonenumber-js";
import React, { forwardRef, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useUserManager } from "service/UserManager";
import "../shopping/order.css";
const countries: CountryCode[] = ["US", "CA", "AU"];
const CustomInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      style={{
        padding: "10px",
        borderRadius: "4px",
        border: "1px solid #ccc",
        width: "100%",
      }}
      placeholder="Enter phone number"
    />
  );
});
CustomInput.displayName = "CustomInput";
const OrderCollect: React.FC = () => {
  const { user } = useUserManager();
  const [country, setCountry] = useState<string | undefined>("CA");
  const [value, setValue] = useState<string | undefined>(undefined);

  console.log(country);
  console.log(value);

  return (
    <div className="reward_container">
      <div className="reward_detail">Order Collect</div>
      <div id="phone_collect" className="phone_collect">
        <div className="phone_container">
          <div className="phone_number">
            {user?.uid ? (
              <span>(416)494-3381</span>
            ) : (
              <div style={{ display: "flex" }}>
                <PhoneInput
                  countries={countries}
                  defaultCountry={country as CountryCode}
                  value={value}
                  onChange={setValue}
                />
              </div>
            )}
          </div>
        </div>
        <div className="btn_submit">Collect</div>
      </div>
    </div>
  );
};

export default OrderCollect;
