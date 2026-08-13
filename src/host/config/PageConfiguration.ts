
export const TacticalPlace =
{
    name: "tacticalPlace",
    entry: "tactical",
    context: "/tactical",
    navs: [
        {
            name: "lobby",
            auth: 1,
            path: "./lobby/tactical/LobbyHome",
            uri: "lobby",
            /** 冷启动真实请求：`useColdBootPreload` + BootLoadingOverlay；可改成大厅首屏大图 CDN。手动看清加载阶段可在 DevTools → Network 选 Slow 3G。 */
            bootCriticalAssetUrls: [
              `${import.meta.env.BASE_URL}logo192.png`,
              `${import.meta.env.BASE_URL}icons/001-clock.svg`,
            ],
            child: "child2",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
            control: "./lobby/tactical/LobbyControl",
            children: [
                { name: "child1", class: "page_container", init: "slide", path: "./lobby/tactical/view/Child1", uri: "c1", auth: 1, open: "slideIn" },
                /** 路由需 auth:0，否则未登录时 openPage 不会派发 pageOpen，大厅 slide 不会动；权限在 Child2 内处理 */
                { name: "child2", class: "page_container", init: "slide", path: "./lobby/tactical/view/Child2", uri: "c2", auth: 0, open: "slideIn" },
                { name: "child3", class: "page_container", init: "slide", path: "./lobby/tactical/view/Child3", uri: "c3", auth: 0, open: "slideIn" },
                // { name: "child4", class: "pop-right", init: "pops1", path: "./lobby/tactical/view/Child4", uri: "c4", auth: 1, open: "popRightIn", close: { type: 2, effect: "popRightOut" } },
                // { name: "center", class: "pop-center-large", init: "center", path: "./lobby/tactical/center/GameList", uri: "center", auth: 0, enter: "none", open: "popCenterIn", close: { effect: "popCenterOut" } },

            ]
        }

    ]

}

export const CasualPlace =
{
    name: "casualPlace",
    entry: "casual",
    context: "/casual",
    navs: [
        {
            name: "lobby",
            auth: 1,
            path: "./lobby/casual/CasualHome",
            uri: "lobby",
            bootCriticalAssetUrls: [
              `${import.meta.env.BASE_URL}logo192.png`,
              `${import.meta.env.BASE_URL}icons/001-clock.svg`,
            ],
            child: "child3",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
            control: "./lobby/casual/LobbyControl",
            children: [
                { name: "child1", class: "page_container", init: "slide", path: "./lobby/casual/view/shop/CasualShopTab", uri: "c1", auth: 0, open: "slideIn" },
                { name: "child2", class: "page_container", init: "slide", path: "./lobby/casual/view/history/CasualHistoryTab", uri: "c2", auth: 0, open: "slideIn" },
                { name: "child3", class: "page_container", init: "slide", path: "./lobby/casual/view/play/CasualPlayTab", uri: "c3", auth: 0, open: "slideIn" },
                { name: "child4", class: "page_container", init: "slide", path: "./lobby/casual/view/rewards/CasualRewardsTab", uri: "c4", auth: 0, open: "slideIn" },
                { name: "child5", class: "page_container", init: "slide", path: "./lobby/casual/view/town/CasualTownTab", uri: "c5", auth: 0, open: "slideIn" },
            ]
        }

    ]

}

export const PortalPlace =
{
    name: "portalPlace",
    entry: "portal",
    context: "/gc",
    navs: [
        {
            name: "game",
            auth: 0,
            path: "./lobby/portal/PortalGamePage",
            uri: "",
            bootCriticalAssetUrls: [
                `${import.meta.env.BASE_URL}assets/portal/solitaire/backgrounds/bg-16x9.webp`,
                `${import.meta.env.BASE_URL}assets/portal/solitaire/backgrounds/bg-9x16.webp`,
            ],
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
        }
    ]
}

export const TownPlace =
{
    name: "townPlace",
    entry: "mayfield",
    context: "/town",
    navs: [
        {
            name: "mayfield",
            auth: 1,
            path: "./lobby/town/TownMapPage",
            uri: "",
            bootCriticalAssetUrls: [
                `${import.meta.env.BASE_URL}logo192.png`,
            ],
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
        },
    ],
}

export const PlatformPlace =
{
    name: "platformPlace",
    entry: "admin",
    context: "/platform",
    navs: [
        {
            name: "admin",
            auth: 1,
            path: "./lobby/platform/admin/PlatformAdminHomePage",
            uri: "admin",
            class: "page_container page_container--scroll",
            enter: "fadeIn",
            exit: "fadeOut",
        },
    ],
}

export const PartnerPlace =
{
    name: "partnerPlace",
    entry: "admin",
    context: "/partner",
    navs: [
        {
            name: "admin",
            auth: 1,
            path: "./lobby/partner/admin/PartnerAdminHomePage",
            uri: "admin",
            class: "page_container page_container--scroll",
            enter: "fadeIn",
            exit: "fadeOut",
        },
        {
            name: "operation",
            auth: 1,
            path: "./lobby/campaign/merchant/MerchantHomePage",
            uri: "operation",
            class: "page_container page_container--scroll",
            enter: "fadeIn",
            exit: "fadeOut",
        },
    ],
}

export const CampaignPlace =
{
    name: "campaignPlace",
    entry: "campaign",
    context: "/cc",
    navs: [
        {
            name: "home",
            auth: 0,
            path: "./lobby/campaign/marketing/PlayMintMarketingPage",
            uri: "home",
            class: "page_container page_container--scroll",
            enter: "fadeIn",
            exit: "fadeOut",
        },
        {
            name: "landing",
            auth: 0,
            path: "./lobby/campaign/landing/CampaignLandingPage",
            uri: "",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
        },
        {
            /** Compat redirect → /partner/operation */
            name: "merchantLegacyRedirect",
            auth: 0,
            path: "./lobby/campaign/merchant/CampaignMerchantLegacyRedirectPage",
            uri: "merchant",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
        },
    ],
}

/** @deprecated use CampaignPlace (/cc) */
export const PromoPlace = CampaignPlace;

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
export const Modals: Record<string, ModalConfig> = {
    "play_tournament": {
        name: "play_tournament",
        path: "./battle/PlayTournament",
        auth: 0,
        contexts: ["shared"],
        effects: [{ name: "swipeBottom", args: { height: "100%" } }],

    },
    "join_tournament": {
        name: "join_tournament",
        path: "./lobby/tactical/tournament/TournamentJoinList",
        auth: 1,
        contexts: ["tactical"],
        effects: [{ name: "popCenter", orientation: "portrait", args: { height: "100%", width: "100%" } }, { name: "swipeRight", orientation: "landscape", args: { width: "30%" } }],

    },
    "tournament_history": {
        name: "tournament_history",
        path: "./lobby/tactical/tournament/TournamentHistory",
        auth: 1,
        contexts: ["tactical"],
        effects: [{ name: "swipeRight", orientation: "landscape", args: { width: "30%" } }, { name: "swipeRight", orientation: "portrait", args: { width: "100%" } }],
    },
    "chest_drop": {
        name: "chest_drop",
        path: "./lobby/tactical/view/play/ChestDrop",
        auth: 1,
        contexts: ["tactical"],
        effects: [{ name: "popCenter", args: { width: "70%", height: "70%" } }],
    },
    "play_solitaire_solo": {
        name: "play_solitaire_solo",
        path: "./battle/games/solitaireSolo/battle/PlaySolitaireSolo",
        auth: 1,
        contexts: ["shared"],
        /** 屏宽高比 > 10/13：高满屏、宽按 10/13；否则满宽满高 */
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "play_block_blast": {
        name: "play_block_blast",
        path: "./battle/games/blockBlast/battle/PlayBlockBlast",
        auth: 1,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "play_match_3": {
        name: "play_match_3",
        path: "./battle/games/match3/battle/PlayMatch3",
        auth: 1,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "play_yatz": {
        name: "play_yatz",
        path: "./battle/games/yatz/battle/PlayYatz",
        auth: 1,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "play_tower_arena": {
        name: "play_tower_arena",
        path: "./battle/games/towerArena/battle/PlayTowerArena",
        auth: 1,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "casual_tasks_sheet": {
        name: "casual_tasks_sheet",
        path: "./lobby/casual/view/tasks/CasualTasksModal",
        auth: 0,
        contexts: ["casual"],
        effects: [
            { name: "swipeRight", orientation: "landscape", args: { width: "35%" } },
            { name: "swipeRight", orientation: "portrait", args: { width: "100%" } },
        ],
    },
    "casual_game_tournaments": {
        name: "casual_game_tournaments",
        path: "./lobby/casual/view/play/CasualTournamentLobbyModal",
        auth: 0,
        contexts: ["casual"],
        effects: [
            { name: "swipeRight", orientation: "landscape", args: { width: "35%" } },
            { name: "swipeRight", orientation: "portrait", args: { width: "100%" } },
        ],
    },
    "casual_triathlon_lobby": {
        name: "casual_triathlon_lobby",
        path: "./lobby/casual/view/play/CasualTriathlonLobbyModal",
        auth: 0,
        contexts: ["casual"],
        effects: [
            { name: "swipeRight", orientation: "landscape", args: { width: "35%" } },
            { name: "swipeRight", orientation: "portrait", args: { width: "100%" } },
        ],
    },
    "play_casual_triathlon_session": {
        name: "play_casual_triathlon_session",
        path: "./lobby/casual/view/play/PlayCasualTriathlonSession",
        auth: 0,
        contexts: ["casual"],
        effects: [{ name: "popCenter", args: { width: "min(100%, calc(100vh * 10 / 13))", height: "100%" } }],
    },
    "casual_weekly_league": {
        name: "casual_weekly_league",
        path: "./lobby/casual/view/play/CasualWeeklyLeagueModal",
        auth: 0,
        contexts: ["casual"],
        effects: [
            { name: "swipeRight", orientation: "landscape", args: { width: "35%" } },
            { name: "swipeRight", orientation: "portrait", args: { width: "100%" } },
        ],
    },
    "casual_weekly_league_close": {
        name: "casual_weekly_league_close",
        path: "./lobby/casual/view/play/CasualWeeklyLeagueCloseModal",
        auth: 0,
        contexts: ["casual"],
        effects: [{ name: "popCenter", args: { width: "88%", maxWidth: "400px", height: "auto" } }],
    },
    "casual_season_leaderboard": {
        name: "casual_season_leaderboard",
        path: "./lobby/casual/view/play/CasualSeasonLeaderboardModal",
        auth: 0,
        contexts: ["casual"],
        effects: [
            { name: "swipeRight", orientation: "landscape", args: { width: "35%" } },
            { name: "swipeRight", orientation: "portrait", args: { width: "100%" } },
        ],
    },
    "casual_battle_pass": {
        name: "casual_battle_pass",
        path: "./lobby/casual/view/battlePass/CasualBattlePassModal",
        auth: 0,
        contexts: ["casual"],
        /** 自右侧滑入；高度满屏，宽度不超过 800px（窄屏为 100%） */
        effects: [{ name: "swipeRight", args: { width: "min(100%, 800px)" } }],
    },
    "casual_player_profile": {
        name: "casual_player_profile",
        path: "./lobby/casual/view/profile/CasualPlayerProfileModal",
        auth: 0,
        contexts: ["casual"],
        effects: [{ name: "popCenter", args: { width: "88%", maxWidth: "400px", height: "auto" } }],
    },
    "solitaire_rollout_replay_dev": {
        name: "solitaire_rollout_replay_dev",
        path: "./battle/games/solitaireSolo/battle/replay/SolitaireRolloutReplayPage",
        auth: 0,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, 1100px)", height: "min(92vh, 900px)" } }],
    },
    "solitaire_victory_anim_dev": {
        name: "solitaire_victory_anim_dev",
        path: "./battle/games/solitaireSolo/battle/replay/SolitaireVictoryAnimLabPage",
        auth: 0,
        contexts: ["shared"],
        effects: [{ name: "popCenter", args: { width: "min(100%, 1100px)", height: "min(92vh, 860px)" } }],
    },
}
// export const animates: { [k: number]: any } = {
//     1: { autoAlpha: 1, duration: 1.2 },
//     2: { autoAlpha: 0, duration: 1.2 },
//     3: [{ scale: 0.5, autoAlpha: 1 }, { scale: 1, duration: 0.7 }],
//     4: { scale: 0.5, autoAlpha: 0, duration: 0.7 }
// }

export interface AppConfig {
    name: string;
    context: string;
    entry: string;
    navs: PageConfig[];
}
export interface PageConfig {
    app?: string;
    parentURI?: string;
    name: string;
    path: string;
    uri: string;
    auth?: number;
    children?: PageConfig[];
    class?: string;
    init?: string;
    effect?: { enter?: string, exit?: string };
    /**
     * 仅建议配置在 **AppsConfiguration 顶层 nav**（一棵顶层壳）上。
     * 首屏落在该壳下时由 **`useColdBootPreload`** 拉取；**BootLoadingOverlay** 会等到该项列表对应的预加载结束后再淡出（无 URL 则跳过）。
     */
    bootCriticalAssetUrls?: readonly string[];

}
export interface ModalEffect {
    name: string;
    orientation?: "portrait" | "landscape" | "both";
    args?: any;
}
export interface ModalConfig {
    name: string;
    data?: { [key: string]: any };
    path: string;
    auth?: number;
    init?: string;
    class?: string;
    effects?: ModalEffect[];
    /** When omitted, inferred from `path`. `shared` modals load in any active context when opened. */
    contexts?: ("tactical" | "casual" | "portal" | "campaign" | "platform" | "partner" | "town" | "shared")[];
}
export const AppsConfiguration: AppConfig[] = [TacticalPlace, CasualPlace, PortalPlace, TownPlace, CampaignPlace, PlatformPlace, PartnerPlace];

