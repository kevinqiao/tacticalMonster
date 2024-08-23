import { useConvex } from "convex/react";
import PageProps from "model/PageProps";
import React, { useCallback, useEffect, useState } from "react";
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
  const { openPage, getPrePage } = usePageManager();
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

  const goBack = useCallback(() => {
    window.history.back();
    // const prePage = getPrePage();
    // if (prePage) openPage(prePage);
  }, []);
  return (
    <>
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
          <span style={{ fontSize: 20 }}>Scan Order</span>
        </div>
      )}
      {/* <div
        key={"home"}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: 60,
          backgroundColor: "blue",
          color: "white",
          borderStyle: "solid",
          borderWidth: "2px 2px 2px 2px",
          borderColor: "white",
        }}
        onClick={() => goBack()}
      >
        Back To Home
      </div> */}
    </>
  );
};

export default OrderScan;
