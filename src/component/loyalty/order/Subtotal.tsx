import { Discount, DiscountPreset, ServiceCharge, ServiceChargePreset, TaxRate } from "component/loyalty/model/Order";
import React, { useCallback, useMemo } from "react";
import useLocalization from "service/LocalizationManager";
import discounts from "../constant/discount.json";
import serviceCharges from "../constant/service_charge.json";
import { useOrderManager } from "../service/OrderManager";
import "./order.css";
interface Props {
  addition?: boolean;
  onDiscountOpen?: () => void;
  onServiceChargeOpen?: () => void;
}
const Subtotal: React.FC<Props> = ({ addition, onDiscountOpen, onServiceChargeOpen }) => {
  const { locale } = useLocalization();
  const { order, removeDiscount, removeServiceCharge } = useOrderManager();

  const subtotal = useMemo(() => {
    const sub = order?.lineItems.reduce((total, item) => {
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
  }, [order]);
  const discountAmount = useCallback(
    (dis: Discount) => {
      console.log(dis);
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
      if (subtotal && order) {
        const discounts = order.discounts.reduce((t, dis) => {
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
    [subtotal, order]
  );
  const serviceCharge = useCallback(
    (t: ServiceCharge) => {
      if (subtotal) {
        const discounts = order
          ? order.discounts.reduce((t, dis) => {
              return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
            }, 0)
          : 0;
        const amount = t.amount ?? (t.percent ? t.percent * (subtotal - discounts) : 0);
        return amount.toFixed(2);
      }
      return 0;
    },
    [subtotal, order]
  );
  const total = useMemo(() => {
    if (subtotal > 0) {
      const discounts = order
        ? order.discounts.reduce((t, dis) => {
            return t + (dis.amount ?? (dis.percent ? dis.percent * subtotal : 0));
          }, 0)
        : 0;
      const serviceCharges =
        order && order.serviceCharges
          ? order.serviceCharges.reduce((t, ser) => {
              if (ser.amount) return t + ser.amount;
              else if (ser.percent) {
                const s = Math.round(100 * (subtotal - discounts) * ser.percent) / 100;
                return t + s;
              }
              return 0;
            }, 0)
          : 0;

      const taxs =
        order && order.taxRates
          ? order.taxRates.reduce((t, tax) => {
              const s = Math.round(100 * (subtotal - discounts) * tax.amount) / 100;
              return t + s;
            }, 0)
          : 0;
      return (subtotal - discounts + serviceCharges + taxs).toFixed(2);
    }
  }, [subtotal, order]);

  return (
    <>
      <div className="subtotal-container">
        <div className="subtotal-item">
          <div className="subtotal-item-cell">Subtotal</div>
          <div className="subtotal-item-cell">{subtotal}</div>
        </div>
        {order &&
          order.discounts.map((dis, index) => {
            const disc: DiscountPreset | undefined = discounts.find((c) => c.id === dis.id);
            const name = disc ? disc.name[locale] : "discount";
            const amount = discountAmount(dis);
            return (
              <div key={dis.id + "-" + index} className="subtotal-item">
                <div className="subtotal-item-cell">{name}</div>
                <div className="subtotal-item-cell">
                  <div className="subtotal-item-delete" onClick={() => removeDiscount(dis)}>
                    X
                  </div>
                </div>
                <div className="subtotal-item-cell">{amount}</div>
              </div>
            );
          })}
        {addition ? (
          <div className="subtotal-item">
            <div className="btn" style={{ width: "auto" }} onClick={onDiscountOpen}>
              Add Discount
            </div>
          </div>
        ) : null}
        {order?.serviceCharges &&
          order.serviceCharges.map((service, index) => {
            const serv: ServiceChargePreset | undefined = serviceCharges.find((c) => c.id === service.id);
            const name = serv ? serv.name[locale] : "Service";
            const amount = serviceCharge(service);
            return (
              <div key={service.id + "-" + index} className="subtotal-item">
                <div className="subtotal-item-cell">{name}</div>
                <div className="subtotal-item-cell">
                  <div className="subtotal-item-delete" onClick={() => removeServiceCharge(service)}>
                    X
                  </div>
                </div>
                <div className="subtotal-item-cell">{amount}</div>
              </div>
            );
          })}
        {addition ? (
          <div className="subtotal-item">
            <div className="btn" style={{ width: "auto" }} onClick={onServiceChargeOpen}>
              Add Service Charge
            </div>
          </div>
        ) : null}
        {order?.taxRates &&
          order.taxRates.map((rate) => (
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
