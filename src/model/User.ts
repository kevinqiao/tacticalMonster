
export interface User {
    uid: string;
    cuid: string;
    name?: string;
    avatar?: string;
    role?: number;
    partner: number;
    token: string;
    battleId: string;
    insearch?: number;
    timelag?: number;
    timestamp?: number;
    phone?: string;
    email?: string;
    lastUpdate?: number;
    lastEventTime?: number;
}
