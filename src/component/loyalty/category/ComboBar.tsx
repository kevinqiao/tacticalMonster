import gsap from "gsap";
import React, { useCallback, useRef } from "react";
import { Combo, ComboGroup, ComboItem } from "../model/Order";
import { useInventoryManager } from "../service/InventoryManager";
import "./menu.css";
interface Props {
  combo: Combo;
  groups?: ComboGroup[];
  selectedItems: ComboItem[];
  onClose: () => void;
  onComplete: () => void;
}
const ComboBar: React.FC<Props> = ({ combo, selectedItems, groups, onClose, onComplete }) => {
  const comboRef = useRef<HTMLDivElement | null>(null);
  const { items } = useInventoryManager();
  const open = useCallback(() => {
    console.log("open selected");
    gsap.fromTo(comboRef.current, { autoAlpha: 1 }, { y: "-120%", duration: 0.5 });
  }, []);

  const total = groups?.reduce((t, s) => {
    const min = s.min_selection ?? 1;
    return (t = t + min);
  }, 0);
  const submit = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <>
      <div className="combo-bar-container" onClick={submit}>
        <div></div>
        <div>OK</div>
        <div>{`(${selectedItems.length}/${total})`}</div>
      </div>
      <div ref={comboRef} className="combo-box-container"></div>
    </>
  );
};

export default ComboBar;
