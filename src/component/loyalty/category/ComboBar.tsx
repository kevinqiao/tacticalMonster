import gsap from "gsap";
import React, { useCallback, useRef } from "react";
import { ComboItem } from "../model/Order";
import { useInventoryManager } from "../service/InventoryManager";
import "./menu.css";
interface Props {
  comboItems: ComboItem[];
}
const ComboBar: React.FC<Props> = ({ comboItems }) => {
  const comboRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const open = useCallback(() => {
    console.log("open selected");
    gsap.fromTo(comboRef.current, { autoAlpha: 1 }, { y: "-120%", duration: 0.5 });
  }, []);

  return (
    <>
      <div className="combo-bar-container" onClick={open}>
        {comboItems.length}
      </div>

      <div ref={comboRef} className="combo-box-container"></div>
    </>
  );
};

export default ComboBar;
