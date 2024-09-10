
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
    children?: { name: string; path: string; uri: string; exit?: number }[];
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
    // app: string;
    // name: string;
    visible?: number;
    data: { [k: string]: any } | null
}

export interface PageItem {
    name: string;
    app: string; //null|undefined-cover
    data?: { [key: string]: any };
    params?: { [key: string]: string };
    hash?: { [key: string]: string };
    child?: string;
}