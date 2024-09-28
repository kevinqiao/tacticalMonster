import React, { useMemo } from "react";
import "../merchant/register/register.css";
import { useCartManager } from "../service/OrderManager";
import CartLineItemList from "./CartLineItemList";
import "./cart.css";
const CartBox: React.FC = () => {
  const { cart } = useCartManager();

  const subtotal = useMemo(() => {
    const total = cart.lineItems.reduce((t, s) => (t = t + s.price * s.quantity), 0);
    return total;
  }, [cart]);

  return (
    <div className="cart-container">
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
    </div>
  );
};

export default CartBox;
