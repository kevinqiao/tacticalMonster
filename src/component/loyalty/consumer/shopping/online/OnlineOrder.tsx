import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import InventoryProvider from "../../../service/InventoryManager";

import { OrderType } from "component/loyalty/model/Order";
import OrderProvider from "../../../service/OrderManager";
import GroundLayout from "./GroundLayout";

const OnlineOrder: React.FC<PageProps> = ({ visible, data, children }) => {
  console.log("register:" + visible);
  const render = useMemo(() => {
    if (visible && visible > 0)
      return (
        <InventoryProvider>
          <OrderProvider type={OrderType.TAKEOUT}>
            <GroundLayout />
            {children}
          </OrderProvider>
        </InventoryProvider>
      );
  }, [visible]);
  return <>{render}</>;
};

export default OnlineOrder;
