import React from "react";

import { usePageManager } from "service/PageManager";

const TableList: React.FC = () => {
  const { openChild } = usePageManager();

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div className="table-container">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
          <div key={t + ""} className="table-item">{`table:${t}`}</div>
        ))}
      </div>
    </div>
  );
};

export default TableList;
