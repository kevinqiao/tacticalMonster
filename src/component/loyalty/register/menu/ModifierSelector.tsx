import React, { useRef } from "react";
import "../register.css";
const ModifierSelector: React.FC = () => {
  const groupRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="active-container">
      <div style={{ width: "100%", height: "100%" }}>
        <div ref={groupRef} id="modifier-groups">
          <div id="nav-group"></div>
        </div>
        <div id="modifier-list">
          <div id="nav-group"></div>
        </div>
      </div>
    </div>
  );
};

export default ModifierSelector;
