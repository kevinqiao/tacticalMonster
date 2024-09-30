import { PopProps } from "component/RenderApp";
import React from "react";
import "../merchant/register/register.css";
import "./order.css";
import OrderPanel from "./OrderPanel";
const OrderReview: React.FC<PopProps> = ({ onClose, data }) => {
  return <OrderPanel onClose={onClose}></OrderPanel>;
};

export default OrderReview;
