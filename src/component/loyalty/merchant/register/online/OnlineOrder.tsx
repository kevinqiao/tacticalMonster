import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import InventoryProvider from "../../../service/InventoryManager";

import { OrderType } from "component/loyalty/model/Order";
import TableProvider from "component/loyalty/service/TableManager";
import OrderProvider from "../../../service/OrderManager";
import "../register.css";
import GroundLayout from "./GroundLayout";

const DineIn: React.FC<PageProps> = ({ visible, data, children }) => {
  console.log("register:" + visible);
  const render = useMemo(() => {
    if (visible && visible > 0)
      return (
        <InventoryProvider>
          <TableProvider>
            <OrderProvider type={OrderType.DINEIN}>
              <GroundLayout />
              {children}
            </OrderProvider>
          </TableProvider>
        </InventoryProvider>
      );
  }, [visible]);
  return <>{render}</>;
};

export default DineIn;
