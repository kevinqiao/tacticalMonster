export interface Tournament {
    id: string;
    creator?: string;//uid
    context?: string;
    type: number;//0-one battle score  is final 1-PVP N battle for  points rank  2-solo battle for best score rank
    participants: number;
    battle: { type: number; duration: number; sessions: number; players: number };//type:0-sync 1-async 2-sync or async
    openTime?: number;
    closeTime?: number;
    schedule?: { day: number; weekday: number; hour: number; minute: number, duration: number };//duration is hourly
    entry?: { level: number; cost: { asset: number; amount: number }[] };
    rewards: { rank: number; points?: number; assets: { asset: number; amount: number }[] }[],
    status?: number;//0-close 1-open
}