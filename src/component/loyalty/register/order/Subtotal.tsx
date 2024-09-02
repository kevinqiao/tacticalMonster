import { Discount, ServiceCharge, TaxRate } from "model/RegisterModel";
import React, { useCallback, useMemo } from "react";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";
import "./order.css";
interface Props {
  addition?: boolean;
  onDiscountOpen?: () => void;
  onServiceChargeOpen?: () => void;
}
const Subtotal: React.FC<Props> = ({ addition, onDiscountOpen, onServiceChargeOpen }) => {
  const { cart, removeDiscount, removeServiceCharge } = useCartManager();
  const { discounts, serviceCharges } = useInventoryManager();
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
        return (0 - amount).toFixed(2);
      }
      return 0;
    },
    [subtotal]
  );
  const tax = useCallback(
    (tax: TaxRate) => {
      if (subtotal && cart) {
        const discounts = cart.discounts.reduce((t, dis) => {
          return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
        }, 0);
        const nettotal = subtotal - discounts;
        // const charges = cart.serviceCharges?.reduce((t, service) => {
        //   return t + (service.amount ?? (service.percent ? service.percent * nettotal : 0));
        // }, 0);
        const tamount = Math.round(100 * nettotal * tax.amount) / 100;
        return tamount.toFixed(2);
      }
      return 0;
    },
    [subtotal, cart]
  );
  const serviceCharge = useCallback(
    (t: ServiceCharge) => {
      if (subtotal) {
        const discounts = cart
          ? cart.discounts.reduce((t, dis) => {
              return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
            }, 0)
          : 0;
        const amount = t.amount ?? (t.percent ? t.percent * (subtotal - discounts) : 0);
        return amount.toFixed(2);
      }
      return 0;
    },
    [subtotal, cart]
  );
  const total = useMemo(() => {
    if (subtotal > 0) {
      const discounts = cart
        ? cart.discounts.reduce((t, dis) => {
            return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
          }, 0)
        : 0;
      const serviceCharges =
        cart && cart.serviceCharges
          ? cart.serviceCharges.reduce((t, ser) => {
              if (ser.amount) return t + ser.amount;
              else if (ser.percent) {
                const s = Math.round(100 * (subtotal - discounts) * ser.percent) / 100;
                return t + s;
              }
              return 0;
            }, 0)
          : 0;

      const taxs =
        cart && cart.taxRates
          ? cart.taxRates.reduce((t, tax) => {
              const s = Math.round(100 * (subtotal - discounts) * tax.amount) / 100;
              return t + s;
            }, 0)
          : 0;
      return (subtotal - discounts + serviceCharges + taxs).toFixed(2);
    }
  }, [subtotal, cart]);
  const getServiceName = useCallback(
    (service: ServiceCharge) => {
      if (serviceCharges) {
        const scharge = serviceCharges.find((c) => c.id === service.id);
        return scharge?.name;
      }
    },
    [serviceCharges]
  );
  const getDiscountName = useCallback(
    (discount: Discount) => {
      if (discounts) {
        const dis = discounts.find((c) => c.id === discount.id);
        return dis?.name;
      }
    },
    [discounts]
  );
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
              <div className="subtotal-item-cell">{getDiscountName(dis)}</div>
              <div className="subtotal-item-cell">
                <div className="subtotal-item-delete" onClick={() => removeDiscount(dis)}>
                  X
                </div>
              </div>
              <div className="subtotal-item-cell">{discount(dis)}</div>
            </div>
          ))}
        {addition ? (
          <div className="subtotal-item">
            <div className="btn" style={{ width: "auto" }} onClick={onDiscountOpen}>
              Add Discount
            </div>
          </div>
        ) : null}
        {cart?.serviceCharges &&
          cart.serviceCharges.map((service, index) => (
            <div key={service.id + "-" + index} className="subtotal-item">
              <div className="subtotal-item-cell">{getServiceName(service)}</div>
              <div className="subtotal-item-cell">
                <div className="subtotal-item-delete" onClick={() => removeServiceCharge(service)}>
                  X
                </div>
              </div>
              <div className="subtotal-item-cell">{serviceCharge(service)}</div>
            </div>
          ))}
        {addition ? (
          <div className="subtotal-item">
            <div className="btn" style={{ width: "auto" }} onClick={onServiceChargeOpen}>
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
