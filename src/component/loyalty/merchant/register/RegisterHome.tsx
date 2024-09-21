import PageProps from "model/PageProps";
import React from "react";
import InventoryProvider from "../../service/InventoryManager";

import OrderProvider from "../../service/OrderManager";
import GroundLayout from "./GroundLayout";
import "./register.css";

const RegisterHome: React.FC<PageProps> = ({ visible, data, children }) => {
  return (
    <InventoryProvider>
      <OrderProvider>
        <GroundLayout />
        {children}
      </OrderProvider>
    </InventoryProvider>
  );
};

export default RegisterHome;
