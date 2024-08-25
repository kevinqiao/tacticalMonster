export interface OrderModel {
    id: string;
    currency: string;
    total: number;
    taxRemoved: boolean;
    isVat: boolean;
    state: string;//"open","locked"
    manualTransaction: boolean;
    groupLineItems: boolean;
    createdTime: number;
    modifiedTime: number;
    serviceCharges: ServiceCharge[];
    lineItems: OrderLineItemModel[];
    customers: Customer[];
    discounts: Discount[];
    modifications: OrderModifier[];
    taxRates: TaxRate[];
}
export interface OrderLineItemModel {
    id: string;
    price: number;
    quantity: number;
    discounts: Discount[];
    modifiers: OrderModifier[];
    taxRates: TaxRate[];
}
interface Discount {
    id: string;
    name: string;
    amount: number;
    percentage: number;
}
export interface OrderModifier {
    id: string;
    name: string;
    quantity: number;
    amount: number;
}
export interface TaxRate {
    id: string;
    name: string;
    rate: number;
}
export interface ServiceCharge {
    id: string;
    name: string;
    amount: number
}
export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
}


export interface InventoryItem {
    id: string;
    name: { [k: string]: string };
    description?: { [k: string]: string };
    price: number;
    modifierGroups?: string[];
    categories: string[]
}
export interface ModifierGroup {
    id: string;
    name: { [k: string]: string };
    description?: { [k: string]: string };
    min_selection?: number;
    max_selection?: number;
    modifiers: InventoryModifier[];
}
export interface InventoryModifier {
    id: string;
    name: { [k: string]: string };
    description: { [k: string]: string };
    min_quanity?: number;
    max_quantity?: number;
    price: number;
}

export interface InventoryService {
    id: string;
    name: { [k: string]: string };
    description?: { [k: string]: string };
    price: number;
}
export interface InventoryCategory {
    id: string;
    name: { [k: string]: string };
    description?: { [k: string]: string };
    parentId?: string;
}



