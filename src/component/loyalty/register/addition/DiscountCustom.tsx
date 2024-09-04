import { Discount } from "model/RegisterModel";
import React, { useCallback, useRef, useState } from "react";
import "./addition.css";

interface Props {
  type: number; //1-percentage 2-amount
  onComplete: (dis: Discount) => void;
  onCancel: () => void;
}

const DiscountCustom: React.FC<Props> = ({ type, onCancel, onComplete }) => {
  const codeRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState<number>(0);
  const add = useCallback((num: string) => {
    setAmount((pre) => {
      const am = pre > 0 ? pre + num : num + "";
      if ((type === 1 && +am <= 100) || (type === 2 && +am < 500)) return +am;
      return pre;
    });
  }, []);
  const back = useCallback(() => {
    setAmount((pre) => Math.floor(pre / 10));
    console.log("back");
  }, []);
  const done = useCallback(() => {
    setAmount(0);
    const dis: Discount = { id: "####" };
    if (type === 2) dis["amount"] = amount;
    else dis["percent"] = amount / 100;
    onComplete(dis);
  }, [amount]);
  const cancel = useCallback(() => {
    setAmount(0);
    onCancel();
  }, []);
  return (
    <div className="discount-custom-content">
      <div style={{ width: "90%" }}>
        <div ref={codeRef} id="code_enter" className="discount-custom-amount">
          {type === 1 ? (
            <div style={{ fontSize: 25 }}>{amount + "%"}</div>
          ) : (
            <div style={{ fontSize: 25 }}>{"CA$" + amount}</div>
          )}
        </div>
        <div ref={padRef} id="key_pad" className="keypad-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c, index) => (
            <div key={"pad-" + c} className="keypad-cell" onClick={() => add(c + "")}>
              {c}
            </div>
          ))}
          <div key={"00-pad"} className="keypad-cell" onClick={() => add("00")}>
            00
          </div>
          <div key={"0-pad"} className="keypad-cell" onClick={() => add("0")}>
            0
          </div>
          <div key={"x-pad"} className="keypad-cell" onClick={back}>
            {"<"}
          </div>
        </div>
        <div style={{ display: "flex", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "center", width: "50%" }}>
            <div className="btn" onClick={cancel}>
              Cancel
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", width: "50%" }}>
            <div className="btn" onClick={done}>
              Done
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountCustom;
