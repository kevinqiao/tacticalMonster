
export const PlayPlace =
{
    name: "playPlace",
    entry: "playcenter",
    context: "/play",
    auth: 0,//0-public 1-consumer 2-worker 3-admin
    logout: "/play/lobby/c3",
    navs: [
        {
            name: "lobby",
            auth: 0,
            path: "./lobby/LobbyHome",
            uri: "lobby",
            child: "child2",
            class: "page_container",
            enter: "fadeIn",
            exit: "fadeOut",
            control: "./lobby/LobbyControl",
            children: [
                { name: "child1", class: "child_container", init: "slide", path: "./lobby/view/Child1", uri: "c1", auth: 1, open: "slideIn" },
                { name: "child2", class: "child_container", init: "slide", path: "./lobby/view/Child2", uri: "c2", auth: 1, open: "slideIn" },
                { name: "child3", class: "child_container", init: "slide", path: "./lobby/view/Child3", uri: "c3", auth: 0, open: "slideIn" },
                { name: "child4", class: "pop-right", init: "pops1", path: "./lobby/view/Child4", uri: "c4", auth: 1, open: "popRightIn", close: { type: 2, effect: "popRightOut" } },
                { name: "center", class: "pop-center-large", init: "center", path: "./lobby/center/GameList", uri: "center", auth: 0, enter: "none", open: "popCenterIn", close: { effect: "popCenterOut" } },
                { name: "topNav", class: "pop-right", init: "pops1", path: "./lobby/control/NavControl", uri: "topNav", auth: 0, open: "popRightIn", close: { type: 1, effect: "popRightOut" } },

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
        init: "fadeIn",
        openEffect: "popCenterIn",
        closeEffect: "popCenterOut",
    },
    "game_over": {
        name: "game_over",
        path: "./battle/GameOver",
        auth: 0,
        init: "fadeIn",
        openEffect: "popCenterIn",
        closeEffect: "popCenterOut",
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
    auth: number;
    navs: PageConfig[];
}
export interface PageConfig {
    app?: string;
    parentURI?: string;
    name: string;
    path: string;
    uri: string;
    auth?: number;
    logout?: string;
    child?: string;
    children?: PageConfig[];
    class?: string;
    init?: string;
    enter?: string;
    exit?: string;
    control?: string;
    open?: string;
    close?: { type?: number, effect: string };

}
export interface ModalConfig {
    name: string;
    data?: { [key: string]: any };
    path: string;
    auth?: number;
    init?: string;
    openEffect?: string;
    closeEffect?: string;
}
export const AppsConfiguration: AppConfig[] = [PlayPlace];

