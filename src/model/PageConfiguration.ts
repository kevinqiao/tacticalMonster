
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
            name: "member",
            auth: 1,
            path: "./loyalty/consumer/member/MemberHome",
            uri: "/member",
            children: [
                { name: "orderhistory", path: "./OrderHistoryHome", uri: "order" },
                { name: "inbox", path: "./InboxHome", uri: "inbox" },
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
            name: "order",
            auth: 2,
            path: "./loyalty/merchant/OrderHome",
            uri: "/order",
        },
        {
            name: "member",
            auth: 2,
            path: "./loyalty/merchant/MemberHome",
            uri: "/member",
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
    navs: any[];
}
export interface PageConfig {
    name: string;
    path: string;
    uri: string;
    auth: number;
    children?: {
        name: string;
        path: string;
        uri: string;
        auth: number;
    }[]

}
export const AppsConfiguration: any[] = [PlayPlace, Consumer, Merchant, W3Home];
export const AppModules: { [k: string]: { apps: string[], configs: AppConfig[] } } = {
    consumer: { apps: ["consumer", "w3"], configs: [Consumer, W3Home] }
}
