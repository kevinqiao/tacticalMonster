import React from "react";
import { useInventoryManager } from "../context/InventoryManager";
import { PopProps } from "../RegisterHome";
import "./menu.css";
const InventoryItemMain: React.FC<PopProps> = ({ data, onClose }) => {
  const { items } = useInventoryManager();

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "white" }}>
      <div className="inventory-price">
        <div style={{ width: 100 }}></div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
            color: "white",
          }}
        >
          {data?.obj?.name + " CA$" + data?.obj?.price}
        </div>
        <div style={{ width: 100 }}></div>
      </div>
      <div className="inventory-desc"></div>
      <div className="modifier-group-container">
        <div className="modifier-group-item"></div>
        <div className="modifier-group-item" style={{ backgroundColor: "blue" }}></div>
        <div className="modifier-group-item"></div>
      </div>
      <div className="modifiers-container">
        <div className="modifiers-item"></div>
        <div className="modifiers-item"></div>
        <div className="modifiers-item"></div>
        <div className="modifiers-item"></div>
        <div className="modifiers-item"></div>
      </div>
    </div>
  );
};

export default InventoryItemMain;
