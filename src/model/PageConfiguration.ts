
export const PlayPlace =
{
    name: "playPlace",
    entry: "playcenter",
    context: "/",
    auth: 1,//0-public 1-consumer 2-worker 3-admin
    navs: [
        {
            name: "playcenter",
            auth: 1,
            path: "./lobby/LobbyHome",
            uri: "playcenter",
            child: "battleHome",
            children: [
                { name: "tournamentHome", path: "./tournament/TournamentHome", uri: "tournament/home" },
                { name: "assetHome", path: "./assets/AssetListHome", uri: "asset/home" },
                { name: "battleHome", path: "./battle/RecordListHome", uri: "battle/home" },
                { name: "accountHome", path: "./signin/AccountHome", uri: "signin/home" },
                { name: "avatarList", path: "", uri: "" },
            ]
        },
    ],
    stacks: [

        {
            name: "battlePlay",
            path: "./play/PlayHome",
            uri: "./play/PlayHome",
            auth: true,
            nohistory: true,
            position: {
                closeControl: { btn: 0, confirm: 1, maskActive: 1 },
                direction: 0,
                animate: { from: { scale: 0.5 }, to: { scale: 1 } },
                width: 1,
                height: 1,
            }
        },
        {
            name: "battleReplay",
            path: "./play/ReplayHome",
            uri: "./battle/replay",
            auth: true,
            nohistory: true,
            position: {
                closeControl: { btn: 0, confirm: 0, maskActive: 0 },
                direction: 0,
                width: 1,
                height: 1,
            }
        },
        {
            name: "leaderboard",
            path: "./leaderboard/LeaderBoardHome",
            uri: "./battle/leaderboard",
            position: {
                closeControl: { btn: 0, confirm: 0, maskActive: 0 },
                direction: 0,
                width: 0.7,
                height: 0.7,
                maxWidth: 500,
            }
        }

    ]
}
export const Consumer =
{
    name: "consumer",
    context: "loyalty",
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
            name: "scanOrder",
            auth: 0,
            path: "./loyalty/consumer/shopping/DineIn",
            uri: "/dinein",
            children: [
                { name: "orderReview", path: "./loyalty/cart/OrderReview", uri: "order", auth: 0, pop: { open: 1, close: 2, exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", auth: 0, pop: { open: 1, close: 2, exit: 1 } },
                { name: "cartReview", path: "./loyalty/cart/CartBox", uri: "cart", auth: 0, pop: { open: 1, close: 2, exit: 1 } },
                { name: "cartItem", path: "./loyalty/cart/CartItem", uri: "cart/item", auth: 0, pop: { open: 1, close: 2, exit: 1 } },
                { name: "addCartItem", path: "./loyalty/cart/AddCartItem", uri: "cart/additem", pop: { open: 1, close: 2 } },
                { name: "modifier", path: "./loyalty/cart/EditCartModification", uri: "modifier", pop: { open: 1, close: 2 } },
            ]
        },
        {
            name: "onlineOrder",
            auth: 0,
            path: "./loyalty/consumer/shopping/OnlineOrder",
            uri: "/online",
            children: [
                { name: "orderReview", path: "./loyalty/order/OrderReview", uri: "order", pop: { open: 1, close: 2, exit: 1 } },
                { name: "orderAddition", path: "./loyalty/order/addition/OrderBaseAdd", uri: "order/addition", pop: { open: 1, close: 2, exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", pop: { open: 1, close: 2, exit: 1 } },
                { name: "inventoryItem", path: "./loyalty/category/InventoryItemMain", uri: "inventory/item", pop: { open: 1, close: 2, exit: 1 } },
                { name: "discount", path: "./loyatly/order/addition/DiscountPanel", uri: "discount", pop: { open: 1, close: 2, exit: 1 } },
                { name: "serviceCharge", path: "./loyalty/order/addition/ServiceChargePanel", uri: "service_charge", pop: { open: 1, close: 2, exit: 1 } },
                { name: "modifier", path: "./loyalty/order/addition/Modifier", uri: "modifier", pop: { open: 1, close: 2, exit: 1 } },
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
            path: "./loyalty/merchant/register/RegisterHome",
            uri: "/register",
            children: [
                { name: "orderReview", path: "./loyalty/order/OrderReview", uri: "order", pop: { open: 1, close: 2, exit: 1 } },
                { name: "orderAddition", path: "./loyalty/order/addition/OrderBaseAdd", uri: "order/addition", pop: { open: 1, close: 2, exit: 1 } },
                { name: "orderItem", path: "./loyalty/order/OrderItem", uri: "order/item", pop: { open: 1, close: 2, exit: 1 } },
                { name: "inventoryItem", path: "./loyalty/category/InventoryItemMain", uri: "inventory/item", pop: { open: 1, close: 2, exit: 1 } },
                { name: "discount", path: "./loyatly/order/addition/DiscountPanel", uri: "discount", pop: { open: 1, close: 2, exit: 1 } },
                { name: "serviceCharge", path: "./loyalty/order/addition/ServiceChargePanel", uri: "service_charge", pop: { open: 1, close: 2, exit: 1 } },
                { name: "modifier", path: "./loyalty/order/addition/Modifier", uri: "modifier", pop: { open: 1, close: 2, exit: 1 } },
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
    navs: NavConfig[];
}
export interface NavConfig {
    app?: string;
    name: string;
    path: string;
    uri: string;
    auth?: number;
    pop?: { open: number; close: number; exit?: number }
    children?: {
        name: string;
        path: string;
        uri: string;
        auth?: number;
        pop?: { open: number; close: number; exit?: number }
    }[]

}
export const AppsConfiguration: any[] = [Consumer, Merchant, W3Home];
export const AppModules: { [k: string]: { apps: string[] } } = {
    consumer: { apps: ["consumer", "w3"] }
}
