import { Discount, ServiceCharge, TaxRate } from "model/RegisterModel";
import React, { useCallback, useMemo } from "react";
import { useCartManager } from "../context/CartManager";
import "../register.css";
import "./order.css";
interface Props {
  addition?: boolean;
  onDiscountOpen?: () => void;
  onServiceChargeOpen?: () => void;
}
const Subtotal: React.FC<Props> = ({ addition, onDiscountOpen, onServiceChargeOpen }) => {
  const { cart } = useCartManager();
  const subtotal = useMemo(() => {
    const sub = cart?.lineItems.reduce((total, item) => {
      let itemTotal = item.price * item.quantity;
      if (item.discounts) {
        const distotal = item.discounts.reduce((t, dis) => {
          return t + (dis.amount ?? (dis.percent ? dis.percent * itemTotal : 0));
        }, 0);
        itemTotal = itemTotal - distotal;
      }
      return total + itemTotal;
    }, 0);
    return sub ?? 0;
  }, [cart]);
  const discount = useCallback(
    (dis: Discount) => {
      if (subtotal) {
        const amount = dis.amount ?? (dis.percent ? dis.percent * subtotal : 0);
        return amount;
      }
      return 0;
    },
    [subtotal]
  );
  const tax = useCallback(
    (t: TaxRate) => {
      if (subtotal && cart) {
        const discounts = cart.discounts.reduce((t, dis) => {
          return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
        }, 0);
        const tamount = (subtotal - discounts) * t.amount;
        return tamount.toFixed(2);
      }
      return 0;
    },
    [subtotal, cart]
  );
  const serviceCharge = useCallback(
    (t: ServiceCharge) => {
      if (subtotal) {
        const amount = t.amount ?? (t.percent ? t.percent * subtotal : 0);
        return amount.toFixed(2);
      }
      return 0;
    },
    [subtotal]
  );
  const total = useMemo(() => {
    if (subtotal > 0) {
      const discounts = cart
        ? cart.discounts.reduce((t, dis) => {
            return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
          }, 0)
        : 0;
      const nettotal = subtotal - discounts;
      const taxs =
        cart && cart.taxRates
          ? cart.taxRates.reduce((t, tax) => {
              return t + tax.amount * nettotal;
            }, 0)
          : 0;

      const serviceCharges =
        cart && cart.serviceCharges
          ? cart.serviceCharges.reduce((t, ser) => {
              return t + (ser.amount ?? (ser.percent ? ser.percent * nettotal : 0));
            }, 0)
          : 0;

      return (nettotal + taxs + serviceCharges).toFixed(2);
    }
  }, [subtotal, cart]);
  return (
    <>
      <div className="subtotal-container">
        <div className="subtotal-item">
          <div className="subtotal-item-cell">Subtotal</div>
          <div className="subtotal-item-cell">{subtotal}</div>
        </div>
        {cart &&
          cart.discounts.map((dis, index) => (
            <div key={dis.id + "-" + index} className="subtotal-item">
              <div className="subtotal-item-cell">{dis.id}</div>
              <div className="subtotal-item-cell">{discount(dis)}</div>
            </div>
          ))}
        {addition ? (
          <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
            <div className="btn" style={{ width: "auto" }} onClick={onDiscountOpen}>
              Add Discount
            </div>
          </div>
        ) : null}
        {cart?.serviceCharges &&
          cart.serviceCharges.map((service) => (
            <div key={service.id} className="subtotal-item">
              <div className="subtotal-item-cell">{service.name}</div>
              <div className="subtotal-item-cell">{serviceCharge(service)}</div>
            </div>
          ))}
        {addition ? (
          <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginTop: 10 }}>
            <div className="btn" style={{ width: "auto" }}>
              Add Service Charge
            </div>
          </div>
        ) : null}
        {cart?.taxRates &&
          cart.taxRates.map((rate) => (
            <div key={rate.id} className="subtotal-item">
              <div className="subtotal-item-cell">{rate.name}</div>
              <div className="subtotal-item-cell">{tax(rate)}</div>
            </div>
          ))}
        <div className="subtotal-item">
          <div className="subtotal-item-cell">Total</div>
          <div className="subtotal-item-cell">{total}</div>
        </div>
      </div>
    </>
  );
};

export default Subtotal;
