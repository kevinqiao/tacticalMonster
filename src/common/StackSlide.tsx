import gsap from "gsap";
import React, { useRef } from "react";
import useCoord from "../service/TerminalManager";
import "./popup.css";
interface PopupProps {
  zIndex: number;
  render: (togglePopup: () => void) => React.ReactNode;
}

const StackPop: React.FC<PopupProps> = ({ zIndex, render }) => {
  const { width, height } = useCoord();
  const popupRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef(null);

  const togglePopup = () => {
    gsap.to(popupRef.current, { autoAlpha: 0, scale: 0.4, duration: 0.3, ease: "back.in(1.1)" });
    gsap.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
  };
  return (
    <>
      <div ref={maskRef} className="mask" style={{ zIndex, opacity: 0 }}></div>
      <div className="popup" ref={popupRef} style={{ width: width, height: height, zIndex: zIndex + 1, opacity: 0 }}>
        {render(togglePopup)}
      </div>
    </>
  );
};

export default StackPop;
