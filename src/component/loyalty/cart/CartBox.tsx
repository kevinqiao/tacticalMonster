import { PopProps } from "component/RenderApp";
import React, { useCallback, useMemo } from "react";
import "../merchant/register/register.css";
import { useCartManager } from "../service/OrderManager";
import CartLineItemList from "./CartLineItemList";
import "./cart.css";
const CartBox: React.FC<PopProps> = ({ onClose, data }) => {
  const { cart, clear, submit } = useCartManager();
  const subtotal = useMemo(() => {
    const total = cart.lineItems.reduce((t, s) => (t = t + s.price * s.quantity), 0);
    return total;
  }, [cart]);
  const confirm = useCallback(() => {
    submit();
    if (onClose) onClose();
  }, [submit]);
  const clearBox = useCallback(() => {
    clear();
    if (onClose) onClose();
  }, []);
  return (
    <div className="cart-container">
      <div style={{ height: 80, width: "100%", backgroundColor: "red", marginBottom: 10 }}>Shopping Cart</div>
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <CartLineItemList />
      </div>
      <div className="cart-subtotal">
        <div className="cart-subtotal-column">
          <span>Subtotal:</span>
        </div>
        <div className="cart-subtotal-column">
          <span>{subtotal}</span>
        </div>
      </div>
      <div style={{ height: 70 }} />
      <div className="cart-control">
        <div className="btn" onClick={clearBox}>
          Clear
        </div>
        <div className="btn" onClick={confirm}>
          Submit
        </div>
      </div>
    </div>
  );
};

export default CartBox;
