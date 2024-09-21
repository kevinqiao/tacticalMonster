import React from "react";

import useEventSubscriber from "service/EventManager";
import { useUserManager } from "service/UserManager";
import { OrderProps } from "../OrderScan";

const OrderRedeem: React.FC<OrderProps> = ({ order }) => {
  const { user } = useUserManager();
  const { createEvent } = useEventSubscriber();
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "green",
          color: "white",
        }}
      >
        <div>
          <div> Order Detail</div>
          {user?.uid ? (
            <div
              style={{
                cursor: "pointer",
                width: "100px",
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "blue",
                color: "white",
              }}
            >
              Redeem
            </div>
          ) : (
            <div
              style={{
                cursor: "pointer",
                width: "100px",
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "blue",
                color: "white",
              }}
              onClick={() => createEvent({ name: "signin", topic: "account", delay: 0 })}
            >
              Login
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderRedeem;
