
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
    name: string;
    ctx?: string;
    data?: any;
    params?: any;
    child?: string;
    // anchor?: string;
    config: PageConfig;
    dimension?: PagePattern;
    disableCloseBtn?: () => void;
    close?: (type: number) => void;
}

export interface PageItem {
    name: string;
    app: string; //null|undefined-cover
    ctx?: string;
    data?: { [key: string]: any };
    params?: { [key: string]: string };
    hash?: { [key: string]: string };
    child?: string;
    time?: number;
    render?: number;//0-unrender 1-render completed
}