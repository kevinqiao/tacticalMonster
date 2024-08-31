
export interface PagePattern {
    vw: number;
    vh: number;
    width: number;
    height: number;
    direction: number;
    animate?: { from: any; to: any }
}
export interface PagePosition {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    // direction: number
}
export interface PageConfig {
    name: string;
    path?: string;
    uri: string;
    auth?: number;
    nohistory?: boolean;
    child?: string;
    children?: { name: string; path: string; uri: string }[];
    position?: {
        closeControl?: { btn: number; confirm: number; maskActive: number };
        direction: number;
        animate?: { from: any; to: any }
        width: number;
        height: number;
        maxWidth?: number;
    }
}
export default interface PageProps {
    app: string;
    name: string;
    params?: { [k: string]: string };
    visible?: number;
}

export interface PageItem {
    name: string;
    app: string; //null|undefined-cover
    history?: number;
    ctx?: string;
    data?: { [key: string]: any };
    params?: { [key: string]: string };
    hash?: { [key: string]: string };
    child?: string;
    time?: number;
    render?: number;//0-unrender 1-render completed
}