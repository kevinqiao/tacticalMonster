
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
            path: "./loyalty/consumer/order/OrderScan",
            uri: "/scan/order",
        },
        {
            name: "register",
            auth: 0,
            path: "./loyalty/register/RegisterHome",
            uri: "/register",
            children: [
                { name: "orderReview", path: "./loyalty/register/order/OrderReview", uri: "order", pop: { open: 1, close: 2 } },
                { name: "orderAddition", path: "./loyalty/register/addition/OrderBaseAdd", uri: "order/addition", pop: { open: 1, close: 1 } },
                { name: "orderItem", path: "./loyalty/register/order/OrderItem", uri: "order/item", pop: { open: 1, close: 1 } },
                { name: "inventoryItem", path: "./loyalty/register/menu/InventoryItemMain", uri: "inventory/item", pop: { open: 1, close: 1 } },
                { name: "discount", path: "./loyalty/register/addition/DiscountPanel", uri: "discount", pop: { open: 1, close: 1 } },
                { name: "serviceCharge", path: "./loyalty/register/addition/ServiceChargePanel", uri: "service_charge", pop: { open: 1, close: 1 } },
                { name: "modifier", path: "./loyalty/register/addition/Modifier", uri: "modifier", pop: { open: 1, close: 1 } },
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
            name: "home",
            auth: 2,
            path: "./loyalty/merchant/MerchantHome",
            uri: "/home",
        },
        {
            name: "register",
            auth: 2,
            path: "./loyalty/register/RegisterHome",
            uri: "/register",
            children: [
                { name: "orderReview", path: "./order/OrderReview", uri: "order", exit: 1 },
                { name: "orderAddition", path: "./addition/OrderBaseAdd", uri: "order/addition", exit: 1 },
                { name: "orderItem", path: "./order/OrderItem", uri: "order/item", exit: 1 },
                { name: "inventoryItem", path: "./menu/InventoryItemMain", uri: "inventory/item", exit: 1 },
                { name: "discount", path: "./addition/DiscountPanel", uri: "discount", exit: 0 },
                { name: "serviceCharge", path: "./addition/ServiceChargePanel", uri: "service_charge", exit: 0 },
                { name: "modifier", path: "./addition/Modifier", uri: "modifier", exit: 1 },
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
    app: string;
    name: string;
    path: string;
    uri: string;
    auth: number;
    pop?: { open: number; close: number; exit?: number }
    children?: {
        name: string;
        path: string;
        uri: string;
        auth: number;
    }[]

}
export const AppsConfiguration: any[] = [PlayPlace, Consumer, Merchant, W3Home];
export const AppModules: { [k: string]: { apps: string[] } } = {
    consumer: { apps: ["consumer", "w3"] }
}
