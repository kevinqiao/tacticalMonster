import { OrderType } from "model/Order";
import PageProps from "model/PageProps";
import React from "react";
import InventoryProvider from "../../service/InventoryManager";
import OrderProvider from "../../service/OrderManager";
import GroundLayout from "./GroundLayout";

const OnlineOrder: React.FC<PageProps> = ({ visible, data, children }) => {
  return (
    <InventoryProvider>
      <OrderProvider type={OrderType.PICKUP}>
        <GroundLayout />
        {children}
      </OrderProvider>
    </InventoryProvider>
  );
};

export default OnlineOrder;
