import { useConvex } from "convex/react";
import PageProps from "model/PageProps";
import React, { useEffect, useState } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/_generated/api";
import OrderCollect from "./OrderCollect";
import OrderRedeem from "./OrderRedeem";
export interface OrderProps {
  order: { id: string; status: number };
}
const OrderScan: React.FC<PageProps> = (prop) => {
  const [order, setOrder] = useState<{ id: string; status: number } | null>(null);
  const { user } = useUserManager();
  const convex = useConvex();
  useEffect(() => {
    const fetchOrder = async (orderId: string) => {
      const o = await convex.query(api.loyalty.consumer.findOrder, { orderId });
      setOrder(o);
    };
    if (prop.params?.orderId) {
      const orderId = prop.params.orderId;
      fetchOrder(orderId);
    }
  }, [prop]);

  return (
    <>
      {order ? (
        <>
          {order.status === 0 ? <OrderCollect /> : null}
          {order.status === 1 ? <OrderRedeem order={order} /> : null}
        </>
      ) : (
        <div style={{ width: "100vw", height: "100vh", backgroundColor: "red", color: "white" }} />
      )}
    </>
  );
};

export default OrderScan;
