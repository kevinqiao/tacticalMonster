import PageProps from "model/PageProps";
import React from "react";
import InventoryProvider from "../../service/InventoryManager";

import { OrderType } from "model/Order";
import OrderProvider from "../../service/OrderManager";
import GroundLayout from "./GroundLayout";
import "./register.css";

const RegisterHome: React.FC<PageProps> = ({ visible, data, children }) => {
  console.log("register:" + visible);
  return (
    <InventoryProvider>
      <OrderProvider type={OrderType.DINEIN}>
        <GroundLayout />
        {children}
      </OrderProvider>
    </InventoryProvider>
  );
};

export default RegisterHome;
