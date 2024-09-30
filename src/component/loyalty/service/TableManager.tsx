import { useConvex } from "convex/react";

import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";

export interface TableModel {
  id: string;
  no: number;
  orderId?: string;
  size: number;
  checkIn?: number;
  status?: number; //0-open 1-in service 2-reserved 3-disable
}

interface ITableContext {
  tables: TableModel[];
  selectedTable: TableModel | null;
  selectTable: (table: TableModel) => void;
}
const TableContext = createContext<ITableContext>({
  tables: [],
  selectedTable: null,
  selectTable: () => null,
});

const TableProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<TableModel[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableModel | null>(null);
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();
  const convex = useConvex();

  useEffect(() => {
    const ts = Array.from({ length: 100 }, (_, index) => ({
      id: `table_${index + 1}`,
      no: index + 1,
      size: Math.floor(Math.random() * 100) + 1,
    }));
    setTables(ts);
  }, [partner, locale]);
  const selectTable = useCallback((table: TableModel) => {
    setSelectedTable(table);
  }, []);
  const value = {
    tables,
    selectedTable,
    selectTable,
  };

  return (
    <>
      <TableContext.Provider value={value}> {children} </TableContext.Provider>
    </>
  );
};
export const useTableManager = () => {
  return useContext(TableContext);
};
export default TableProvider;
