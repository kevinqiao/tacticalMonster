
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
export enum PageStatus {
    INIT = 1,
    SWITCH = 2,
    OPEN = 3,
}
export default interface PageProps {
    visible?: number;
    data: { [k: string]: any } | null;
    param?: { [k: string]: string }
    children?: React.ReactNode
}

