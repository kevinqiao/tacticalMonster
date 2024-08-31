import { useConvex } from "convex/react";
import {
  Customer,
  Discount,
  InventoryItem,
  Modification,
  OrderLineItemModel,
  ServiceCharge,
  TaxRate,
} from "model/RegisterModel";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
export const ActiveType = {
  INVENTORY: 1,
  ORDER: 2,
  DISCOUNT: 3,
  SERVICE_CHARGE: 4,
  CUSTOMER: 5,
  CUSTOM_ITEM: 6,
};
export interface ActiveComponent {
  type: number;
  model: any;
}
export interface CartModel {
  serviceCharges?: ServiceCharge[];
  lineItems: OrderLineItemModel[];
  customers?: Customer[];
  discounts: Discount[];
  modifications?: Modification[];
  taxRates?: TaxRate[];
}

interface ICartContext {
  visible: number;
  lastItemAdded: OrderLineItemModel | null;
  activeComponent: ActiveComponent | null;
  cart: CartModel | null;
  openActive: (c: ActiveComponent) => void;
  closeActive: () => void;

  selectInventory: (item: InventoryItem) => void;
  updateItem: (item: OrderLineItemModel) => void;
  removeItem: (item: OrderLineItemModel) => void;
  addServiceCharge: (service: ServiceCharge) => void;
  updateServiceCharge: (service: ServiceCharge) => void;
  removeServiceCharge: (service: ServiceCharge) => void;
  addDiscount: (discount: Discount) => void;
  updateDiscount: (discount: Discount) => void;
  removeDiscount: (discount: Discount) => void;
  addTaxRate: (taxRate: TaxRate) => void;
  removeTaxRate: (taxRate: TaxRate) => void;
}
const CartContext = createContext<ICartContext>({
  visible: 0,
  lastItemAdded: null,
  activeComponent: null,
  cart: null,
  openActive: (c: ActiveComponent) => null,
  closeActive: () => null,
  selectInventory: (item: InventoryItem) => null,
  updateItem: (item: OrderLineItemModel) => null,
  removeItem: (item: OrderLineItemModel) => null,
  addServiceCharge: (service: ServiceCharge) => null,
  updateServiceCharge: (service: ServiceCharge) => null,
  removeServiceCharge: (service: ServiceCharge) => null,
  addDiscount: (discount: Discount) => null,
  updateDiscount: (discount: Discount) => null,
  removeDiscount: (discount: Discount) => null,
  addTaxRate: (taxRate: TaxRate) => null,
  removeTaxRate: (taxRate: TaxRate) => null,
});
const taxRates = [
  { id: "t0001", name: "HST", amount: 0.07 },
  { id: "t0002", name: "GST", amount: 0.06 },
];
const discounts = [
  { id: "d0001", name: "discount1", percent: 0.1 },
  { id: "d0002", name: "discount2", amount: 2 },
];
const serviceCharges = [
  { id: "s0001", name: "service1", percent: 0.12 },
  { id: "s0002", name: "service2", amount: 2 },
];
const CartProvider = ({ children, visible }: { children: ReactNode; visible: number }) => {
  const [cart, setCart] = useState<CartModel>({ lineItems: [], discounts: [], taxRates, serviceCharges: [] });
  const [lastItemAdded, setLastItemAdded] = useState<OrderLineItemModel | null>(null);
  const [activeComponent, setActiveComponent] = useState<ActiveComponent | null>(null);

  console.log("cart provider:" + visible);
  const convex = useConvex();
  useEffect(() => {
    const cartJSON = localStorage.getItem("cart");
    if (cartJSON) setCart(JSON.parse(cartJSON));
  }, []);

  const selectInventory = useCallback(
    (item: InventoryItem) => {
      if (item.modifierGroups && item.modifierGroups.length > 0) {
        setActiveComponent({ type: ActiveType.INVENTORY, model: item });
        return null;
      } else {
        const index = cart.lineItems.findIndex((c) => c.id === item.id);
        if (index >= 0) {
          const citem = cart.lineItems.splice(index, 1)[0];
          citem.quantity++;
          cart.lineItems.push({ ...citem });
        } else {
          const citem = { id: item.id, quantity: 1, price: item.price };
          cart.lineItems.push(citem);
        }
        setLastItemAdded({ id: item.id, quantity: 1, price: item.price });
        localStorage.setItem("cart", JSON.stringify(cart));
      }
    },
    [cart]
  );

  const updateItem = useCallback((item: OrderLineItemModel) => {
    setCart((pre) => {
      const index = pre.lineItems.findIndex((c) => c.id === item.id);
      if (index >= 0) {
        const citem = pre.lineItems.splice(index, 1)[0];
        Object.assign(citem, item);
        pre.lineItems.push({ ...citem });
        localStorage.setItem("cart", JSON.stringify(pre));
        return { ...pre };
      }
      return pre;
    });
  }, []);
  const removeItem = useCallback((item: OrderLineItemModel) => {
    setCart((pre) => {
      const citems = pre.lineItems.filter((c) => c.id !== item.id);
      return { ...pre, lineItems: citems };
    });
  }, []);

  const addServiceCharge = useCallback((service: ServiceCharge) => {
    setCart((pre) => {
      const services = pre.serviceCharges ?? [];
      services.push(service);
      return { ...pre, serviceCharges: services };
    });
  }, []);
  const updateServiceCharge = useCallback((service: ServiceCharge) => {
    setCart((pre) => {
      const services = pre.serviceCharges ?? [];
      const citem = services.find((c) => c.id === service.id);
      if (citem) {
        Object.assign(citem, service);
        return { ...pre };
      }
      return pre;
    });
  }, []);
  const removeServiceCharge = useCallback((service: ServiceCharge) => {
    setCart((pre) => {
      const services = pre.serviceCharges ?? [];
      const citems = services.filter((c) => c.id !== service.id);
      return { ...pre, serviceCharges: citems };
    });
  }, []);
  const addDiscount = useCallback((discount: Discount) => {
    setCart((pre) => {
      const discounts = pre.discounts ?? [];
      const c = { ...pre, discounts: [...discounts, discount] };
      localStorage.setItem("cart", JSON.stringify(c));
      return c;
    });
  }, []);
  const updateDiscount = useCallback((discount: Discount) => {
    setCart((pre) => {
      const discounts = pre.serviceCharges ?? [];
      const citem = discounts.find((c) => c.id === discount.id);
      if (citem) {
        Object.assign(citem, discount);
        return { ...pre };
      }
      return pre;
    });
  }, []);
  const removeDiscount = useCallback((discount: Discount) => {
    setCart((pre) => {
      const discounts = pre.discounts ?? [];
      const citems = discounts.filter((c) => c.id !== discount.id);
      return { ...pre, discounts: citems };
    });
  }, []);
  const addTaxRate = useCallback((taxRate: TaxRate) => {
    setCart((pre) => {
      const taxRates = pre.taxRates ?? [];
      taxRates.push(taxRate);
      return { ...pre, taxRates };
    });
  }, []);
  const removeTaxRate = useCallback((taxRate: TaxRate) => {
    setCart((pre) => {
      const taxRates = pre.taxRates ?? [];
      const citems = taxRates.filter((c) => c.id !== taxRate.id);
      return { ...pre, taxRates: citems };
    });
  }, []);
  const openActive = useCallback((active: ActiveComponent) => {
    setActiveComponent(active);
  }, []);
  const closeActive = useCallback(() => {
    setActiveComponent(null);
  }, []);
  const value = {
    visible,
    lastItemAdded,
    activeComponent,
    cart,
    openActive,
    closeActive,
    selectInventory,
    updateItem,
    removeItem,
    addDiscount,
    updateDiscount,
    removeDiscount,
    addServiceCharge,
    updateServiceCharge,
    removeServiceCharge,
    addTaxRate,
    removeTaxRate,
  };

  return <>{cart !== null ? <CartContext.Provider value={value}> {children} </CartContext.Provider> : null}</>;
};
export const useCartManager = () => {
  return useContext(CartContext);
};
export default CartProvider;
