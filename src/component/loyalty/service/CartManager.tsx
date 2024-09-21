import {
  Customer,
  Discount,
  InventoryItem,
  Modification,
  OrderLineItemModel,
  ServiceCharge,
  TaxRate,
} from "model/Order";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
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
  lastItemAdded: OrderLineItemModel | null;
  cart: CartModel | null;

  selectInventory: (item: InventoryItem) => void;
  addItem: (item: OrderLineItemModel) => void;
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
  clear: () => void;
}
const CartContext = createContext<ICartContext>({
  lastItemAdded: null,
  cart: null,
  selectInventory: (item: InventoryItem) => null,
  addItem: (item: OrderLineItemModel) => null,
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
  clear: () => null,
});
const taxRates = [
  { id: "t0001", name: "HST", amount: 0.07 },
  { id: "t0002", name: "GST", amount: 0.06 },
];

const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartModel>({ lineItems: [], discounts: [], taxRates, serviceCharges: [] });
  const [lastItemAdded, setLastItemAdded] = useState<OrderLineItemModel | null>(null);
  const { openChild } = usePageManager();

  useEffect(() => {
    const cartJSON = localStorage.getItem("cart");
    if (cartJSON) setCart(JSON.parse(cartJSON));
  }, []);

  const selectInventory = useCallback(
    (item: InventoryItem) => {
      if (item.modifierGroups && item.modifierGroups.length > 0) {
        // openPop("inventoryItem", { type: POP_DATA_TYPE.ORDER, obj: item });
        openChild("addOrderItem", item);
        return;
      } else {
        let citem;
        const index = cart.lineItems.findIndex((c) => c.inventoryId === item.id);
        if (index >= 0) {
          citem = cart.lineItems.splice(index, 1)[0];
          citem.quantity++;
          cart.lineItems.splice(index, 0, { ...citem });
        } else {
          citem = { id: Date.now() + "", inventoryId: item.id, quantity: 1, price: item.price };
          cart.lineItems.push(citem);
        }
        setLastItemAdded({ id: citem.id, inventoryId: item.id, quantity: 1, price: item.price });
        localStorage.setItem("cart", JSON.stringify(cart));
      }
    },
    [cart, openChild]
  );
  const addItem = useCallback((item: OrderLineItemModel) => {
    setCart((pre) => {
      pre.lineItems.push(item);
      localStorage.setItem("cart", JSON.stringify(pre));
      pre.lineItems = [...pre.lineItems];
      setLastItemAdded(item);
      return pre;
    });
  }, []);
  const updateItem = useCallback((item: OrderLineItemModel) => {
    setCart((pre) => {
      const index = pre.lineItems.findIndex((c) => c.id === item.id);
      if (index >= 0) {
        const citem = pre.lineItems.splice(index, 1)[0];
        Object.assign(citem, item);
        pre.lineItems.splice(index, 0, { ...citem });
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
      const charges = pre.serviceCharges ?? [];
      const c = { ...pre, serviceCharges: [...charges, { ...service, time: Date.now() }] };
      localStorage.setItem("cart", JSON.stringify(c));
      return c;
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
      const citems = services.filter((c) => c.time !== service.time);
      const c = { ...pre, serviceCharges: citems };
      localStorage.setItem("cart", JSON.stringify(c));
      return c;
    });
  }, []);
  const addDiscount = useCallback((discount: Discount) => {
    setCart((pre) => {
      const discounts = pre.discounts ?? [];
      const c = { ...pre, discounts: [...discounts, { ...discount, time: Date.now() }] };
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
      const citems = discounts.filter((c) => c.time !== discount.time);
      const c = { ...pre, discounts: citems };
      localStorage.setItem("cart", JSON.stringify(c));
      return c;
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
  const clear = useCallback(() => {
    localStorage.removeItem("cart");
    setCart({ lineItems: [], discounts: [], taxRates, serviceCharges: [] });
  }, []);

  const value = {
    lastItemAdded,
    cart,
    selectInventory,
    addItem,
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
    clear,
  };
  console.log(cart);
  return <>{cart !== null ? <CartContext.Provider value={value}> {children} </CartContext.Provider> : null}</>;
};
export const useCartManager = () => {
  return useContext(CartContext);
};
export default CartProvider;
