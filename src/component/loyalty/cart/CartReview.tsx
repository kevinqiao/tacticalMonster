import { PopProps } from "component/RenderApp";
import React from "react";
import "../merchant/register/register.css";
import "./cart.css";
import CartPanel from "./CartPanel";
const CartReview: React.FC<PopProps> = ({ onClose }) => {
  // const { order, clear, submit } = useCartManager();
  // const confirm = useCallback(() => {
  //   submit();
  //   if (onClose) onClose();
  // }, [submit]);
  // const clearBox = useCallback(() => {
  //   clear();
  //   if (onClose) onClose();
  // }, []);
  // return (
  //   <div className="cart-container">
  //     <div
  //       style={{
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //         height: 80,
  //         width: "100%",
  //         backgroundColor: "red",
  //         marginBottom: 10,
  //       }}
  //     >
  //       Table: {order?.location?.tableNo}
  //     </div>
  //     <CartBox />
  //     <div style={{ height: 70 }} />
  //     <div className="cart-control">
  //       <div className="btn" onClick={clearBox}>
  //         Clear
  //       </div>
  //       <div className="btn" onClick={confirm}>
  //         Submit
  //       </div>
  //     </div>
  //   </div>
  // );
  return <CartPanel onClose={onClose}></CartPanel>;
};

export default CartReview;
