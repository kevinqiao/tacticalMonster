import {
  CartModel,
  Discount,
  InventoryItem,
  Modification,
  OrderLineItemModel,
  OrderModel,
  OrderStatus,
  OrderType,
  ServiceCharge,
  TaxRate,
} from "model/Order";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useTerminal } from "service/TerminalManager";
import { useUserManager } from "service/UserManager";
export const ActiveType = {
  INVENTORY: 1,
  ORDER: 2,
  DISCOUNT: 3,
  SERVICE_CHARGE: 4,
  CUSTOMER: 5,
  CUSTOM_ITEM: 6,
};
export interface OrderEvent {
  name: string;
  type: number;
  data: any;
}
const taxRates = [
  { id: "t0001", name: "HST", amount: 0.07 },
  { id: "t0002", name: "GST", amount: 0.06 },
];
interface IOrderContext {
  cart: CartModel;
  order: OrderModel | null;
  orderType: number;
  canEdit: number; //0-uneditable 1-editable
  lastItemAdded: OrderLineItemModel | null;
  fetchOrder: (orderId: string) => OrderModel | null;
  setCart: React.Dispatch<React.SetStateAction<CartModel>>;
  setOrder: React.Dispatch<React.SetStateAction<OrderModel>>;
  setLastItemAdded: React.Dispatch<React.SetStateAction<OrderLineItemModel | null>>;
  setOrderType: React.Dispatch<React.SetStateAction<number>>;
  selectInventory: (item: InventoryItem) => void;
  addItem: (lineItems: OrderLineItemModel[], item: InventoryItem, modifications: Modification[]) => void;
  // updateItem: (item: OrderLineItemModel) => void;
  // removeItem: (item: OrderLineItemModel) => void;
  // addServiceCharge: (service: ServiceCharge) => void;
  // updateServiceCharge: (service: ServiceCharge) => void;
  // removeServiceCharge: (service: ServiceCharge) => void;
  // addDiscount: (discount: Discount) => void;
  // updateDiscount: (discount: Discount) => void;
  // removeDiscount: (discount: Discount) => void;
  // addTaxRate: (taxRate: TaxRate) => void;
  // removeTaxRate: (taxRate: TaxRate) => void;
}
const OrderContext = createContext<IOrderContext>({
  cart: { createdTime: Date.now(), lineItems: [] },
  order: null,
  lastItemAdded: null,
  orderType: 0,
  canEdit: 0,
  fetchOrder: (orderId: string) => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setCart: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setOrder: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setLastItemAdded: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setOrderType: () => {},
  selectInventory: (item: InventoryItem) => null,

  addItem: (lineItems: OrderLineItemModel[], item: InventoryItem, modifications: Modification[]) => null,
  // removeItem: (item: OrderLineItemModel) => null,
  // addServiceCharge: (service: ServiceCharge) => null,
  // updateServiceCharge: (service: ServiceCharge) => null,
  // removeServiceCharge: (service: ServiceCharge) => null,
  // addDiscount: (discount: Discount) => null,
  // updateDiscount: (discount: Discount) => null,
  // removeDiscount: (discount: Discount) => null,
  // addTaxRate: (taxRate: TaxRate) => null,
  // removeTaxRate: (taxRate: TaxRate) => null,
});

const OrderProvider = ({ orderId, type, children }: { orderId?: string; type?: number; children: ReactNode }) => {
  const [order, setOrder] = useState<OrderModel>({
    createdTime: Date.now(),
    groupCount: 1400,
    lineItems: [],
    discounts: [],
    taxRates,
    serviceCharges: [],
  });
  const [cart, setCart] = useState<CartModel>({ createdTime: Date.now(), lineItems: [] });
  const [lastItemAdded, setLastItemAdded] = useState<OrderLineItemModel | null>(null);
  const [orderType, setOrderType] = useState<number>(type ?? 0);
  const [canEdit, setCanEdit] = useState<number>(0);
  const { user } = useUserManager();
  const { terminal } = useTerminal();
  const { app, openChild } = usePageManager();
  useEffect(() => {
    if (user?.role > 0 && (!order?.status || order.status < OrderStatus.PAID)) setCanEdit(1);
    else setCanEdit(0);
  }, [user, order]);
  useEffect(() => {
    if (orderId) {
      console.log("fetching order via api");
    }
  }, [orderId]);
  useEffect(() => {
    const cartJSON = localStorage.getItem("cart");
    if (cartJSON) setCart(JSON.parse(cartJSON));
  }, []);

  const fetchOrder = useCallback((orderId: string) => {
    return null;
  }, []);

  const addItem = useCallback(
    (lineItems: OrderLineItemModel[], inventoryItem: InventoryItem, modifications: Modification[]) => {
      let orderItem: OrderLineItemModel | null = null;
      const orderItems = lineItems.filter((c) => c.inventoryId === inventoryItem.id);
      for (const item of orderItems) {
        if (item.modifications?.length === modifications.length) {
          let modiEqual = true;
          for (const mod of modifications) {
            const modi = item.modifications.find((m) => {
              return m.id === mod.id && m.quantity === mod.quantity ? true : false;
            });
            if (!modi) {
              modiEqual = false;
              break;
            }
          }
          if (modiEqual) orderItem = item;
        }
      }

      if (orderItem) {
        orderItem.quantity++;
      } else {
        orderItem = {
          id: Date.now() + "",
          quantity: 1,
          inventoryId: inventoryItem.id,
          price: inventoryItem.price,
          modifications: [...modifications],
        };
        lineItems.push(orderItem);
      }
      setLastItemAdded(orderItem);
    },
    [cart, terminal]
  );
  const selectInventory = useCallback(
    (item: InventoryItem) => {
      if (app && item.modifierGroups && item.modifierGroups.length > 0) {
        if (app.name === "consumer" && orderType === OrderType.DINEIN) {
          console.log("add cart item");
          openChild("addCartItem", item);
        } else {
          console.log("add order item");
          openChild("addOrderItem", item);
        }
      } else {
        if (app?.name === "consumer" && orderType === OrderType.DINEIN) {
          addItem(cart.lineItems, item, []);
          cart.lineItems = [...cart.lineItems];
          setCart({ ...cart });
          localStorage.setItem("cart", JSON.stringify(cart));
        } else {
          addItem(order.lineItems, item, []);
          setOrder({ ...order });
        }
      }
    },
    [app, cart, order, orderType, openChild]
  );
  const value = {
    cart,
    order,
    orderType,
    canEdit,
    lastItemAdded,
    fetchOrder,
    setCart,
    setOrder,
    setLastItemAdded,
    setOrderType,
    selectInventory,
    addItem,
  };

  return <OrderContext.Provider value={value}> {children} </OrderContext.Provider>;
};

export const useOrderManager = () => {
  const { order, canEdit, addItem, setOrder, selectInventory } = useContext(OrderContext);

  const addOrderItem = useCallback(
    (item: InventoryItem, modifications: Modification[]) => {
      if (order) {
        addItem(order.lineItems, item, modifications);
        setOrder({ ...order });
      }
    },
    [order]
  );
  const updateItem = useCallback(
    (item: OrderLineItemModel) => {
      if (order) {
        console.log(order);
        const index = order.lineItems.findIndex((c) => c.id === item.id);
        if (index >= 0) {
          const citem = order.lineItems.splice(index, 1)[0];
          Object.assign(citem, item);
          order.lineItems.splice(index, 0, { ...citem });
          order.lineItems = { ...order.lineItems };
        }
      }
    },
    [order]
  );
  const removeItem = useCallback(
    (item: OrderLineItemModel) => {
      if (order) {
        const citems = order.lineItems.filter((c) => c.id !== item.id);
        order.lineItems = citems;
      }
    },
    [order]
  );

  const addServiceCharge = useCallback((service: ServiceCharge) => {
    if (order) {
      const charges = order.serviceCharges ?? [];
      order.serviceCharges = [...charges, { ...service, time: Date.now() }];
    }
  }, []);
  const updateServiceCharge = useCallback(
    (service: ServiceCharge) => {
      if (order) {
        const services = order.serviceCharges ?? [];
        const citem = services.find((c) => c.id === service.id);
        if (citem) {
          Object.assign(citem, service);
          order.serviceCharges = [...services];
        }
      }
    },
    [order]
  );
  const removeServiceCharge = useCallback(
    (service: ServiceCharge) => {
      if (order) {
        const services = order.serviceCharges ?? [];
        const citems = services.filter((c) => c.time !== service.time);
        order.serviceCharges = citems;
      }
    },
    [order]
  );
  const addDiscount = useCallback((discount: Discount) => {
    if (order) {
      const discounts = order.discounts ?? [];
      order.discounts = [...discounts, { ...discount, time: Date.now() }];
    }
  }, []);
  const updateDiscount = useCallback((discount: Discount) => {
    if (order) {
      const discounts = order.discounts ?? [];
      const citem = discounts.find((c) => c.id === discount.id);
      if (citem) {
        Object.assign(citem, discount);
        order.discounts = [...discounts];
      }
    }
  }, []);
  const removeDiscount = useCallback((discount: Discount) => {
    if (order) {
      const discounts = order.discounts ?? [];
      const citems = discounts.filter((c) => c.time !== discount.time);
      order.discounts = citems;
    }
  }, []);
  const addTaxRate = useCallback((taxRate: TaxRate) => {
    if (order) {
      const taxRates = order.taxRates ?? [];
      taxRates.push(taxRate);
      order.taxRates = [...taxRates];
    }
  }, []);
  const removeTaxRate = useCallback((taxRate: TaxRate) => {
    if (order) {
      const taxRates = order.taxRates ?? [];
      const citems = taxRates.filter((c) => c.id !== taxRate.id);
      order.taxRates = citems;
    }
  }, []);
  return {
    order,
    canEdit,
    addOrderItem,
    updateItem,
    removeItem,
    addServiceCharge,
    updateServiceCharge,
    removeServiceCharge,
    addDiscount,
    updateDiscount,
    removeDiscount,
    addTaxRate,
    removeTaxRate,
    selectInventory,
  };
};
export const useCartManager = () => {
  const { cart, order, orderType, lastItemAdded, setLastItemAdded, setCart, addItem, setOrder } =
    useContext(OrderContext);
  // const { openChild } = usePageManager();

  // const selectInventory = useCallback(
  //   (item: InventoryItem) => {
  //     console.log(item);
  //     if (item.modifierGroups && item.modifierGroups.length > 0) {
  //       openChild("addCartItem", item);
  //       return;
  //     } else {
  //       addItem(item, []);
  //     }
  //   },
  //   [cart, openChild]
  // );

  // const addItem = useCallback(
  //   (inventoryItem: InventoryItem, modifications: Modification[]) => {
  //     if (cart) {
  //       let orderItem: OrderLineItemModel | null = null;
  //       const orderItems = cart.lineItems.filter((c) => c.inventoryId === inventoryItem.id);
  //       for (const item of orderItems) {
  //         if (item.modifications?.length === modifications.length) {
  //           let modiEqual = true;
  //           for (const mod of modifications) {
  //             const modi = item.modifications.find((m) => {
  //               return m.id === mod.id && m.quantity === mod.quantity ? true : false;
  //             });
  //             if (!modi) {
  //               modiEqual = false;
  //               break;
  //             }
  //           }
  //           if (modiEqual) orderItem = item;
  //         }
  //       }

  //       if (orderItem) {
  //         orderItem.quantity++;
  //       } else {
  //         orderItem = {
  //           id: Date.now() + "",
  //           quantity: 1,
  //           inventoryId: inventoryItem.id,
  //           price: inventoryItem.price,
  //           modifications: [...modifications],
  //         };
  //         cart.lineItems.push(orderItem);
  //         cart.lineItems = [...cart.lineItems];
  //       }
  //       localStorage.setItem("cart", JSON.stringify(cart));
  //       setLastItemAdded({ ...orderItem });
  //     }
  //   },
  //   [cart]
  // );
  const addCartItem = useCallback(
    (item: InventoryItem, modifications: Modification[]) => {
      if (cart) {
        addItem(cart.lineItems, item, modifications);
        localStorage.setItem("cart", JSON.stringify(cart));
        setCart({ ...cart });
      }
    },
    [cart]
  );
  const updateItem = useCallback(
    (item: OrderLineItemModel) => {
      if (cart) {
        const index = cart.lineItems.findIndex((c) => c.id === item.id);
        if (index >= 0) {
          const citem = cart.lineItems.splice(index, 1)[0];
          Object.assign(citem, item);
          cart.lineItems.splice(index, 0, { ...citem });
          cart.lineItems = [...cart.lineItems];
          localStorage.setItem("cart", JSON.stringify(cart));
          setCart((pre) => ({ ...pre }));
        }
      }
    },
    [cart]
  );
  const removeItem = useCallback(
    (item: OrderLineItemModel) => {
      if (cart) {
        const citems = cart.lineItems.filter((c) => c.id !== item.id);
        cart.lineItems = citems;
        localStorage.setItem("cart", JSON.stringify(cart));
        setCart({ ...cart });
      }
    },
    [cart]
  );
  const submit = useCallback(() => {
    if (cart && order) {
      order.groupCount = (order.groupCount ?? 0) + 1;
      cart.lineItems.forEach((item) => (item.groupId = order.groupCount));
      order.lineItems.push(...cart.lineItems);
      cart.lineItems = [];
      localStorage.setItem("cart", JSON.stringify(cart));
      setOrder((pre: OrderModel) => ({ ...pre }));
      setCart((pre) => ({ ...pre }));
    }
  }, [cart, order]);
  const clear = useCallback(() => {
    setCart((pre) => {
      pre.lineItems.length = 0;
      localStorage.removeItem("cart");
      return { ...pre };
    });
  }, []);
  return {
    cart,
    order,
    orderType,
    lastItemAdded,
    addCartItem,
    updateItem,
    removeItem,
    clear,
    submit,
    setLastItemAdded,
  };
};
export default OrderProvider;
