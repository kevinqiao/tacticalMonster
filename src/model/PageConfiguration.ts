
export const PlayPlace =
{
    name: "playPlace",
    entry: "playcenter",
    context: "play",
    auth: 0,//0-public 1-consumer 2-worker 3-admin
    navs: [
        {
            name: "main",
            auth: 0,
            path: "./kumu/PlayGround",
            uri: "main",
            children: [
                { name: "child1", path: "./kumu/component/Child1", uri: "c1", auth: 0 },
                { name: "child2", path: "./kumu/component/Child2", uri: "c2", auth: 0 },
                { name: "child3", path: "./kumu/component/Child3", uri: "c3", auth: 0 },
            ]
        },
        {
            name: "map",
            auth: 0,
            path: "./kumu/KumuApp",
            uri: "map",
        }
    ]

}
export const Consumer =
{
    name: "consumer",
    context: "consumer",
    entry: "home",
    auth: 0,
    navs: [
        {
            name: "home",
            auth: 0,
            path: "./loyalty/consumer/ConsumerHome",
            uri: "/home",
        },
        {
            name: "map",
            auth: 0,
            path: "./kumu/KumuApp",
            uri: "/map",
        },
        {
            name: "scanOrder",
            auth: 0,
            path: "./loyalty/consumer/shopping/dinein/DineIn",
            uri: "/dinein",
            children: [
                { name: "orderReview", path: "./loyalty/cart/CartOrderReview", uri: "order", auth: 0, pop: { animates: [{ terminals: ["1-2"], id: 5 }, { terminals: [], id: 2 }], exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", auth: 0, pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "cartReview", path: "./loyalty/cart/CartReview", uri: "cart", auth: 0, pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "cartItem", path: "./loyalty/cart/CartItem", uri: "cart/item", auth: 0, pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "addCartItem", path: "./loyalty/cart/AddCartItem", uri: "cart/additem", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "modifier", path: "./loyalty/cart/EditCartModification", uri: "modifier", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
            ]
        },
        {
            name: "onlineOrder",
            auth: 0,
            path: "./loyalty/consumer/shopping/online/OnlineOrder",
            uri: "/online",
            children: [
                { name: "orderReview", path: "./loyalty/order/OrderReview", uri: "order", auth: 0, pop: { animates: [{ terminals: ["1-2"], id: 5 }, { terminals: [], id: 2 }], exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", auth: 0, pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "addOrderItem", path: "./loyalty/order/AddCartItem", uri: "order/additem", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "modifier", path: "./loyalty/order/addition/Modifier", uri: "modifier", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
            ]
        },
        {
            name: "member",
            auth: 1,
            path: "./loyalty/consumer/member/MemberHome",
            uri: "/member",
            children: [
                { name: "orderhistory", path: "./OrderHistoryHome", uri: "order" },
                { name: "register", path: "./InboxHome", uri: "inbox" },
                { name: "booking", path: "./BookingHome", uri: "booking" },
                { name: "setting", path: "./SettingHome", uri: "setting" },
            ]
        }

    ],
}
export const Merchant =
{
    name: "merchant",
    context: "merchant",
    entry: "home",
    auth: 0,
    navs: [
        {
            name: "landing",
            auth: 0,
            path: "./loyalty/merchant/Landing",
            uri: "/landing",
        },
        {
            name: "register",
            auth: 0,
            path: "./loyalty/merchant/register/dinein/DineIn",
            uri: "/register",
            children: [
                { name: "orderReview", path: "./loyalty/order/OrderReview", uri: "order", pop: { animates: [{ terminals: ["1-2"], id: 5 }, { terminals: [], id: 2 }], exit: 1 } },
                { name: "orderAddition", path: "./loyalty/order/addition/OrderBaseAdd", uri: "order/addition", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", pop: { animates: [{ terminals: ["1-2"], id: 4 }, { terminals: [], id: 1 }], exit: 1 } },
                { name: "addOrderItem", path: "./loyalty/order/AddOrderItem", uri: "order/additem", pop: { animates: [{ terminals: [], id: 2 }] } },
                { name: "inventoryItem", path: "./loyalty/category/InventoryItemMain", uri: "inventory/item", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "discount", path: "./loyalty/order/addition/DiscountPanel", uri: "discount", pop: { animates: [{ terminals: [], id: 3 }], exit: 0 } },
                { name: "serviceCharge", path: "./loyalty/order/addition/ServiceChargePanel", uri: "service_charge", pop: { animates: [{ terminals: [], id: 3 }], exit: 0 } },
                { name: "modifier", path: "./loyalty/order/addition/Modifier", uri: "modifier", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
            ]
        },
        {
            name: "online",
            auth: 0,
            path: "./loyalty/merchant/register/online/OnlineOrder",
            uri: "/online",
            children: [
                { name: "orderReview", path: "./loyalty/order/OrderReview", uri: "order", pop: { animates: [{ terminals: ["1-2"], id: 5 }, { terminals: [], id: 2 }], exit: 1 } },
                { name: "orderAddition", path: "./loyalty/order/addition/OrderBaseAdd", uri: "order/addition", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", pop: { animates: [{ terminals: ["1-2"], id: 4 }, { terminals: [], id: 1 }], exit: 1 } },
                { name: "addOrderItem", path: "./loyalty/order/AddOrderItem", uri: "order/additem", pop: { animates: [{ terminals: [], id: 2 }] } },
                { name: "inventoryItem", path: "./loyalty/category/InventoryItemMain", uri: "inventory/item", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
                { name: "discount", path: "./loyalty/order/addition/DiscountPanel", uri: "discount", pop: { animates: [{ terminals: [], id: 3 }], exit: 0 } },
                { name: "serviceCharge", path: "./loyalty/order/addition/ServiceChargePanel", uri: "service_charge", pop: { animates: [{ terminals: [], id: 3 }], exit: 0 } },
                { name: "modifier", path: "./loyalty/order/addition/Modifier", uri: "modifier", pop: { animates: [{ terminals: [], id: 1 }], exit: 1 } },
            ]
        }
    ],
}
export const W3Home =
{
    name: "w3",
    context: "/w3",
    entry: "home",
    auth: 0,
    navs: [
        {
            name: "home",
            path: "./www/W3Home",
            uri: "/",
        }
    ],
}

export interface AppConfig {
    name: string;
    context: string;
    entry: string;
    auth: number;
    navs: PageConfig[];
}
export interface PageConfig {
    app?: string;
    name: string;
    path: string;
    uri: string;
    auth?: number;
    children?: {
        name: string;
        path: string;
        uri: string;
        auth?: number;
        pop?: { init?: any; animates: { terminals: string[]; id: number }[], exit?: number }
    }[];
    ele?: HTMLDivElement | null;

}
export const AppsConfiguration: AppConfig[] = [PlayPlace];

