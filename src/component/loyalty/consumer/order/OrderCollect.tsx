import React from "react";
import { useUserManager } from "service/UserManager";

const OrderCollect: React.FC = () => {
  const { user } = useUserManager();

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "blue",
          color: "white",
        }}
      >
        Order Collect
      </div>
    </>
  );
};

export default OrderCollect;
