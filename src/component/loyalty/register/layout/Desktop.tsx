import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import { usePageManager } from "service/PageManager";

import AdditionControl from "../addition/AdditionControl";
import CategoryHome from "../menu/CategoryHome";
import CartBar from "../order/CartBar";
import "../register.css";

const RegisterHome: React.FC = () => {
  const { currentPage } = usePageManager();
  return (
    <>
      <CategoryHome />
      <CartBar />
      <AdditionControl />
    </>
  );
};
export default RegisterHome;
