import OrderBar from "component/loyalty/order/OrderBar";
import React from "react";
import { usePageManager } from "service/PageManager";
import CategoryHome from "../../../category/CategoryHome";
import AdditionControl from "../../../order/addition/AdditionControl";
import "../register.css";

const RegisterHome: React.FC = () => {
  const { currentPage } = usePageManager();
  return (
    <>
      <CategoryHome />
      <OrderBar />
      <AdditionControl />
    </>
  );
};
export default RegisterHome;
