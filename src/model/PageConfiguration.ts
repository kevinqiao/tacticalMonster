
export const PlayPlace =
{
    name: "playPlace",
    entry: "playcenter",
    context: "/play",
    auth: 0,//0-public 1-consumer 2-worker 3-admin
    navs: [
        {
            name: "main",
            auth: 0,
            path: "./kumu/PlayGround",
            uri: "main",
            class: "page_container",
            animate: { open: "fadeIn", close: "fadeOut"},
            control: "./kumu/battle/PlayControl",
            children: [
                { name: "child1", class: "pop-big", path: "./kumu/lobby/view/Child1", uri: "c1", auth: 0, exit: 1, animate: { open: "center" ,close:"center"} },
                { name: "child2", class: "pop-medium", path: "./kumu/lobby/view/Child2", uri: "c2", auth: 0, exit: 0, animate: { open: "center" ,close:"center" } },
                { name: "child3", class: "pop-small", path: "./kumu/lobby/view/Child3", uri: "c3", auth: 0, exit: 1, animate: { open: "center" ,close:"center"} },
            ]
        },
        {
            name: "map",
            auth: 0,
            path: "./kumu/battle/BattlePlayer",
            uri: "map",
            class: "page_container",
            animate: { open: "fadeIn", close: "fadeOut"},
          },
        {
            name: "lobby",
            auth: 0,
            path: "./kumu/lobby/LobbyHome",
            uri: "lobby",
            class: "page_container",
            animate: { open: "fadeIn", close: "fadeOut",child:"child2" },
            control: "./kumu/lobby/LobbyControl",
            children: [
                { name: "child1", class: "child_container", init: "slide", path: "./kumu/lobby/view/Child1", uri: "c1", auth: 1,animate: { open: "slideIn"} },
                { name: "child2", class: "child_container", init: "slide", path: "./kumu/lobby/view/Child2", uri: "c2", auth: 1,animate: { open: "slideIn"} },
                { name: "child3", class: "child_container", init: "slide", path: "./kumu/lobby/view/Child3", uri: "c3", auth: 0,animate: { open: "slideIn"} },
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
    children?: {
        name: string;
        path: string;
        uri: string;
        auth?: number;
    }[];
    class?: string;
    init?: string;
    exit?: number;
    animate?: { open?: string; close?: string;child?:string};
    control?:string;

}
export const AppsConfiguration: AppConfig[] = [PlayPlace];

