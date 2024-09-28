import { PopProps } from "component/RenderApp";
import React, { useEffect } from "react";
import "../merchant/register/register.css";
import LineItemList from "./LineItemList";
import "./order.css";
import Subtotal from "./Subtotal";
const OrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  // const panelRef = useRef<HTMLDivElement | null>(null);
  // const { height } = useTerminal();
  // const [lheight, setLheight] = useState(0);

  // useEffect(() => {
  //   if (panelRef.current) {
  //     const height = window.innerHeight - panelRef.current.clientHeight;
  //     setLheight(height);
  //   }
  // }, [height]);
  // console.log(height);

  useEffect(() => {
    console.log("order review");
  }, [data]);
  return (
    <div className="order-container">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 80,
          width: "100%",
          backgroundColor: "red",
          marginBottom: 10,
        }}
      >
        Order Detail
      </div>
      <div style={{ width: "100%", height: "100%", overflowX: "hidden" }}>
        <LineItemList />
      </div>
      <Subtotal />
      <div style={{ height: 40 }}></div>
      <div className="order-control">
        <div className="btn">Save</div>
        <div className="btn">Pay</div>
      </div>
    </div>
  );
};

export default OrderReview;
