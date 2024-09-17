import PageProps from "model/PageProps";
import React from "react";
import CartProvider from "./context/CartManager";
import InventoryProvider from "./context/InventoryManager";

import GroundLayout from "./GroundLayout";
import "./register.css";

const RegisterHome: React.FC<PageProps> = ({ visible, data, children }) => {
  return (
    <InventoryProvider>
      <CartProvider>
        <GroundLayout />
        {children}
      </CartProvider>
    </InventoryProvider>
  );
};

export default RegisterHome;
