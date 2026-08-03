
export interface PartnerModel {
    name: string;
    host: string;
    pid: number;
    auth: {
        [k: string]: { channels: number[]; role: number };
    };
    authProviders?: { [k: string]: string; name: string; path: string }[];
    channels: { id: number; provider: string; data: any }[];
}
