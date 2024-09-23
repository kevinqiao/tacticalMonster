export interface CartModel {
    createdTime: number;
    lineItems: OrderLineItemModel[];
}
export interface OrderModel {
    id?: string;
    // currency: string;
    total?: number;
    // taxRemoved: boolean;
    // isVat: boolean;
    status?: number;//"open","locked"
    type?: number;//0-dineIn 1-takeout 2-pickup
    tableNo?: number;
    deliver?: { phone: string; address?: string; name?: string };
    groupCount?: number;
    createdTime: number;
    modifiedTime?: number;
    serviceCharges?: ServiceCharge[];
    lineItems: OrderLineItemModel[];
    customers?: Customer[];
    discounts: Discount[];
    taxRates: TaxRate[];
}
export interface OrderLineItemModel {
    id?: string;
    inventoryId: string;
    price: number;
    quantity: number;
    groupId?: number;
    discounts?: Discount[];
    modifications?: Modification[];
    taxRates?: TaxRate[];
}
export interface Discount {
    id: string;
    time?: number;
    amount?: number;
    percent?: number;
}
export interface Modification {
    id: string;//inventory modifier id
    quantity: number;
    price: number;
}
export interface TaxRate {
    id: string;
    name: string;
    amount: number;
}
export interface ServiceCharge {
    id: string;
    time?: number;
    amount?: number;
    percent?: number;
}
export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
}


export interface InventoryItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    modifierGroups?: string[];
    categories: string[]
}
export interface InventoryModifierGroup {
    id: string;
    name: string;
    description?: string;
    min_selection?: number;
    max_selection?: number;
    modifiers?: string[];
}
export interface InventoryModifier {
    id: string;
    name: string;
    description?: string;
    min_quanity?: number;
    max_quantity?: number;
    price: number;
}

export interface InventoryServiceCharge {
    id: string;
    name: string;
    amount?: number;
    percent?: number;
}
export interface InventoryCategory {
    id: string;
    name: string;
    description?: string;
    parent?: string;
}
export interface InventoryDiscount {
    id: string;
    name: string;
    amount?: number;
    percent?: number;
}
export enum OrderType {
    DINEIN = 0,
    TAKEOUT = 1,
    PICKUP = 2,
    DELIVER = 3,
}
export enum OrderStatus {
    OPEN = 0,
    SAVED = 1,
    PAID = 2,
    CANCELLED = 3,
}




