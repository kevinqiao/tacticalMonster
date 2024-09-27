import React, { useCallback } from "react";

import { TableModel, useTableManager } from "../service/TableManager";
import "./table.css";
const TableList: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const { tables, selectTable, selectedTable } = useTableManager();
  console.log(selectedTable);
  const pickTable = useCallback(
    (t: TableModel) => {
      selectTable(t);
      onSelect();
    },
    [selectTable, onSelect]
  );
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div className="table-container">
        {tables.map((t, index) => (
          <div key={t.id + "-" + index} className="table-item" onClick={() => pickTable(t)}>{`table:${t.no}`}</div>
        ))}
      </div>
    </div>
  );
};

export default TableList;
