
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
            animate: { open: 1, close: 2 },
            class: "page_container",
            children: [
                { name: "child1", class: "pop-big", path: "./kumu/component/Child1", uri: "c1", auth: 0, exit: 1, animate: { open: 3, close: 4 } },
                { name: "child2", class: "pop-medium", path: "./kumu/component/Child2", uri: "c2", auth: 0, exit: 0, animate: { open: 3, close: 4 } },
                { name: "child3", class: "pop-small", path: "./kumu/component/Child3", uri: "c3", auth: 0, exit: 1, animate: { open: 3, close: 4 } },
            ]
        },
        {
            name: "map",
            auth: 0,
            path: "./kumu/KumuApp",
            uri: "map",
            class: "page_container",
            animate: { open: 1, close: 2 },
        },
        {
            name: "lobby",
            auth: 0,
            path: "./kumu/Lobby",
            uri: "lobby",
            class: "page_container",
            animate: { open: 1, close: 2, children: { effect: "slide", entry: "child2" } },
            children: [
                { name: "child1", class: "child_container", init: "slide", path: "./kumu/component/Child1", uri: "c1", auth: 0 },
                { name: "child2", class: "child_container", init: "slide", path: "./kumu/component/Child2", uri: "c2", auth: 0 },
                { name: "child3", class: "child_container", init: "slide", path: "./kumu/component/Child3", uri: "c3", auth: 0 },
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
    animate?: { open: number; close: number; child?: number }

}
export const AppsConfiguration: AppConfig[] = [PlayPlace];

