import { useConvex } from "convex/react";
import PageProps from "model/PageProps";
import React, { useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/_generated/api";
import OrderCollect from "./OrderCollect";
import OrderRedeem from "./OrderRedeem";
export interface OrderProps {
  order: { id: string; status: number };
}
const OrderScan: React.FC<PageProps> = (prop) => {
  const [order, setOrder] = useState<{ id: string; status: number } | null>(null);
  const { partner } = usePartnerManager();
  const { user } = useUserManager();
  const { openNav, getPrePage } = usePageManager();
  const convex = useConvex();
  useEffect(() => {
    const fetchOrder = async (orderId: string) => {
      const o = await convex.query(api.loyalty.consumer.findOrder, { orderId });
      setOrder(o);
    };
    if (prop.params?.orderId && partner) {
      const orderId = prop.params.orderId;
      fetchOrder(orderId);
    }
  }, [prop, partner]);

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}>
        <div className="btn" onClick={openNav}>
          Home
        </div>
      </div>
      {order ? (
        <>
          {order.status === 0 ? <OrderCollect /> : null}
          {order.status === 1 ? <OrderRedeem order={order} /> : null}
        </>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100vw",
            height: "100vh",
            backgroundColor: "yellow",
            color: "white",
          }}
        >
          <span style={{ fontSize: 20, color: "red" }}>Scan Order</span>
        </div>
      )}
    </>
  );
};

export default OrderScan;
