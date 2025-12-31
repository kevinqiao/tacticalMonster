export interface User {
    uid: string;
    cuid?: string;
    cid?: string;
    partner?: string;
    token?: string;
    expire?: number;
    lastUpdate?: number;
    name?: string;
    email?: string;
    phone?: string;
    data?: { [k: string]: any };
}
export interface CUser {
    cid?: string;
    cuid: string;
    name?: string;
    data?: { [k: string]: any };
}