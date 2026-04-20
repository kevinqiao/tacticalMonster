
export const PlayPlace =
{
    name: "playPlace",
    entry: "playcenter",
    context: "/play",
    navs: [
        {
            name: "lobby",
            auth: 1,
            path: "./lobby/LobbyHome",
            uri: "lobby",
            child: "child2",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
            control: "./lobby/LobbyControl",
            children: [
                { name: "child1", class: "page_container", init: "slide", path: "./lobby/view/Child1", uri: "c1", auth: 1, open: "slideIn" },
                /** 路由需 auth:0，否则未登录时 openPage 不会派发 pageOpen，大厅 slide 不会动；权限在 Child2 内处理 */
                { name: "child2", class: "page_container", init: "slide", path: "./lobby/view/Child2", uri: "c2", auth: 0, open: "slideIn" },
                { name: "child3", class: "page_container", init: "slide", path: "./lobby/view/Child3", uri: "c3", auth: 0, open: "slideIn" },
                // { name: "child4", class: "pop-right", init: "pops1", path: "./lobby/view/Child4", uri: "c4", auth: 1, open: "popRightIn", close: { type: 2, effect: "popRightOut" } },
                // { name: "center", class: "pop-center-large", init: "center", path: "./lobby/center/GameList", uri: "center", auth: 0, enter: "none", open: "popCenterIn", close: { effect: "popCenterOut" } },
                // { name: "topNav", class: "pop-right", init: "pops1", path: "./lobby/control/NavControl", uri: "topNav", auth: 0, open: "popRightIn", close: { type: 1, effect: "popRightOut" } },

            ]
        }

    ]

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
export const Modals: Record<string, ModalConfig> = {
    "play_tournament": {
        name: "play_tournament",
        path: "./battle/PlayTournament",
        auth: 0,
        effect: { name: "swipeBottom", args: { height: "100%" } },

    },
    "join_tournament": {
        name: "join_tournament",
        path: "./lobby/tournament/TournamentJoinList",
        auth: 1,
        effect: { name: "swipeRight", args: { width: "30%" } },

    },
    "tournament_history": {
        name: "tournament_history",
        path: "./lobby/tournament/TournamentHistory",
        auth: 1,
        effect: { name: "swipeRight", args: { width: "30%" } },

    }
}
export const animates: { [k: number]: any } = {
    1: { autoAlpha: 1, duration: 1.2 },
    2: { autoAlpha: 0, duration: 1.2 },
    3: [{ scale: 0.5, autoAlpha: 1 }, { scale: 1, duration: 0.7 }],
    4: { scale: 0.5, autoAlpha: 0, duration: 0.7 }
}

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

}
export interface ModalConfig {
    name: string;
    data?: { [key: string]: any };
    path: string;
    auth?: number;
    init?: string;
    class?: string;
    effect?: { name: string, args?: any };
}
export const AppsConfiguration: AppConfig[] = [PlayPlace];

