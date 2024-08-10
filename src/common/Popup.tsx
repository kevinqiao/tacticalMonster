import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import { usePageManager } from "../service/PageManager";
import "./popup.css";
interface PopupProps {
  page?: string;
  render: (togglePopup: () => void) => React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ page, render }) => {
  const popupRef = useRef(null);
  const maskRef = useRef(null);
  const { stacks } = usePageManager();
  //   const [isOpen, setIsOpen] = useState(false);
  console.log(stacks);
  const togglePopup = () => {
    // setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!page) return;
    const ps = stacks.find((s) => s.name === page);
    if (ps) {
      gsap.to(popupRef.current, { autoAlpha: 1, duration: 0.3 });
      gsap.to(maskRef.current, { autoAlpha: 0.7, duration: 0.3 });
    } else {
      gsap.to(popupRef.current, { autoAlpha: 0, duration: 0.3 });
      gsap.to(maskRef.current, { autoAlpha: 0, duration: 0.3 });
    }
  }, [stacks, page]);

  return (
    <div>
      <div ref={maskRef} className="mask" style={{ opacity: 0 }}></div>
      <div className="popup" ref={popupRef} style={{ opacity: 0 }}>
        {/* <button onClick={togglePopup}>Close</button> */}
        {render(togglePopup)}
      </div>
    </div>
  );
};

export default Popup;
