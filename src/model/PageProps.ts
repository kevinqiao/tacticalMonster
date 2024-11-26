
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
// export interface PageConfig {
//     name: string;
//     path?: string;
//     uri: string;
//     auth?: number;
//     children?: { name: string; path: string; uri: string; exit?: number }[];

// }
export default interface PageProps {
    visible?: number;
    data: { [k: string]: any } | null;
    param?: { [k: string]: string }
    children?: React.ReactNode
}

export interface PageItem {
    name: string;
    app: string; //null|undefined-cover;
    data?: { [key: string]: any };
    child?: string;
}