import React, { useState } from "react";
import "./order.css";

const OnlineSelector: React.FC = () => {
  const [activeType, setActiveType] = useState<number>(0);

  return (
    <div className="tabs-container">
      <div className={`tab-link ${activeType === 0 ? "active" : ""}`} onClick={() => setActiveType(0)}>
        PICKUP
      </div>
      <div className={`tab-link ${activeType === 1 ? "active" : ""}`} onClick={() => setActiveType(1)}>
        TAKEOUT
      </div>
      <div className={`tab-link ${activeType === 2 ? "active" : ""}`} onClick={() => setActiveType(2)}>
        DELIVER
      </div>
    </div>
  );
};

export default OnlineSelector;
