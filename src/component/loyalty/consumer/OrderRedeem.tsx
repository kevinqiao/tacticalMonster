import { useConvex } from "convex/react";
import PageProps from "model/PageProps";
import React from "react";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";

const OrderRedeem: React.FC<PageProps> = (prop) => {
  const { width, height } = useCoord();
  const { user } = useUserManager();
  const convex = useConvex();

  return (
    <>
      {/* <OrderCollect />
      <OrderRedeem /> */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        Order Act
      </div>
    </>
  );
};

export default OrderRedeem;
