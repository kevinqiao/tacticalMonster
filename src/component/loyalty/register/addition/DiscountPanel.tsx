import DiscountCustom from "component/loyalty/register/addition/DiscountCustom";
import { gsap } from "gsap";
import { Discount } from "model/RegisterModel";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./addition.css";
import DiscountSelector from "./DiscountSelector";
interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: (dis: Discount) => void;
}
const DiscountPanel: React.FC<Props> = ({ open, onClose, onComplete }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [type, setType] = useState<number>(0); //0-fixed 1-custom percent 2-custom amount

  useEffect(() => {
    console.log(open);
    open ? openPop() : closePop(null);
  }, [open]);
  const openPop = useCallback(() => {
    console.log("open discount popup");
    const tl = gsap.timeline({
      onComplete: () => {
        console.log("popup over");
        tl.kill();
      },
    });
    tl.fromTo(maskRef.current, { zIndex: 2000, autoAlpha: 0 }, { autoAlpha: 0.8, duration: 0.7 });
    tl.fromTo(popRef.current, { zIndex: 2000, scale: 0.7, autoAlpha: 1 }, { scale: 1.0, duration: 0.3 }, "<");
    tl.play();
  }, []);
  const closePop = useCallback((timeline: any) => {
    let tl = timeline;
    if (timeline === null) {
      tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
    }
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
    tl.to(popRef.current, { scale: 0.7, autoAlpha: 0, duration: 0.3 }, "<");
    tl.play();
  }, []);

  const selectDiscount = (dis: Discount) => {
    console.log(dis);
    const tl = gsap.timeline({
      onComplete: () => {
        onComplete(dis);
        tl.kill();
      },
    });
    closePop(tl);
    tl.play();
  };
  return (
    <>
      <div ref={maskRef} className="mask"></div>
      <div ref={popRef} className="active-container">
        <div className="discount-container ">
          <div className="discount-head">
            <div className="btn" onClick={onClose}>
              X
            </div>
          </div>
          <div className="discount-content">
            {type === 0 ? (
              <DiscountSelector onCustom={(t) => setType(t)} onSelect={onComplete} />
            ) : (
              <DiscountCustom type={type} onComplete={onComplete} onCancel={() => setType(0)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DiscountPanel;
