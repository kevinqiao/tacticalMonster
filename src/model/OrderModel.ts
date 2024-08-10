export interface OrderModel {
    "id": string;
    "currency": string;
    "total": number;
    "taxRemoved": boolean;
    "isVat": boolean;
    "state": string;//"open","locked"
    "manualTransaction": boolean;
    "groupLineItems": boolean;
    "createdTime": number;
    "modifiedTime": number;
    "serviceCharges": ServiceCharge[];
    "lineItems": LineItemModel[];
    "customers": Customer[];
    "discounts": Discount[];
    "modifications": Modifier[];
    "taxRates": TaxRate[];
}
export interface LineItemModel {

    "id": string;
    "name": string;
    "price": number;
    "quantity": number;
    "discounts": Discount[];
    "modifiers": Modifier[];
    "taxRates": TaxRate[];

}
interface Discount {
    "id": string;
    "name": string;
    "amount": number;
    "percentage": number;
}
interface Modifier {
    "id": string;
    "name": string;
    "amount": number;
}
interface TaxRate {
    "id": string;
    "name": string;
    "rate": number;
}
export interface ServiceCharge {
    "id": string;
    "name": string;
    "amount": number
}
export interface Customer {
    "id": string;
    "name": string;
    "email": string;
    "phone": string;
}




