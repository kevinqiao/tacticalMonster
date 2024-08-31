import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import { usePageManager } from "service/PageManager";
import AdditionControl from "./addition/AdditionControl";
import DiscountMain from "./addition/OrderAddition";
import CartBar from "./CartBar";
import CategoryHome from "./CategoryHome";
import CartProvider from "./context/CartManager";
import InventoryProvider from "./context/InventoryManager";
import LineItemMain from "./order/LineItemList";
import OrderReview from "./order/OrderReview";
import ProductHome from "./ProductHome";
import "./register.css";

const RegisterHome: React.FC<PageProps> = ({ app, name }) => {
  const { currentPage } = usePageManager();

  const visible = useMemo(() => {
    if (currentPage) {
      return app === currentPage.app && name == currentPage.name ? 1 : 0;
    } else return 0;
  }, [currentPage]);
  console.log("visible:" + visible);
  return (
    <InventoryProvider>
      <CartProvider visible={visible}>
        <CategoryHome />
        <CartBar />
        <AdditionControl />
        <ProductHome />
        <OrderReview />
        <LineItemMain />
        <DiscountMain />
      </CartProvider>
    </InventoryProvider>
  );
};

export default RegisterHome;
