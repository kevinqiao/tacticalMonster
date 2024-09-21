import { OrderType } from "model/Order";
import PageProps from "model/PageProps";
import React from "react";
import InventoryProvider from "../../service/InventoryManager";
import OrderProvider from "../../service/OrderManager";
import GroundLayout from "./GroundLayout";

const DineIn: React.FC<PageProps> = ({ visible, data, children }) => {
  return (
    <InventoryProvider>
      <OrderProvider type={OrderType.DINEIN} orderId={data?.orderId}>
        <GroundLayout />
        {children}
      </OrderProvider>
    </InventoryProvider>
  );
};

export default DineIn;
