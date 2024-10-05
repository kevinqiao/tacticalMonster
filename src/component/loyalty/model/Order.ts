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
    type?: number;//0-dineIn 1-takeout 2-pickup 3-deliver
    location: OrderLocation;
    hash?: number;
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
    name?: string;
    inventoryId?: string;
    price: number;
    quantity: number;
    hash?: number;
    discounts?: Discount[];
    modifications?: Modification[];
    comboItems?: ComboItem[];
}
export interface OrderReward {
    discounts?: Discount[];
    coupons?: Discount[];
    points?: number;
    stamps?: number;
}
export interface OrderLocation {
    tableNo?: number;
    phone?: string;
    address?: string;
    name?: string
}
export interface Discount {
    id: string;
    inventoryId?: string;
    time?: number;
    amount?: number;
    percent?: number;
}
export interface ComboItem {
    inventoryId: string;
    groupId?: string;
    quantity?: number;
    price: number;
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
    inventories?: string[];
    combos?: string[]
}
export interface ComboGroup {
    id: string;
    name?: string;
    description?: string;
    min_selection?: number;
    max_selection?: number;
    inventories: ComboItem[];
}
export interface Combo {
    id: string;
    name: string;
    description?: string;
    price: number;
    combogrps: string[];
}
export interface DiscountPreset {
    id: string;
    name: { [k: string]: string };
    percent: number;
}
export interface ServiceChargePreset {
    id: string;
    name: { [k: string]: string };
    percent: number;
}
export interface PromotionRule {
    id: string;
    conditions: any;
    event: any;
    priority: number;
    status: boolean;
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
export enum RewardType {
    DISCOUNT = 0,
    COUPON = 1,
    GIFT = 2,
    POINTS = 3,
    STAMP = 4,
    FREE_SHIPPING = 5,
    BONUS_CREDIT = 6  //额外充值奖励
}






