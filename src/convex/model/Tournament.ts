export interface Tournament {
    id: string;
    type: number;//0-unlimit 1-schedule
    participants: number;
    battleTime: number;
    currentTerm?: number;
    schedule?: { startDay: number; duration: number };
    goal: number,
    cost?: { asset: number; amount: number }[],
    rewards: { rank: number; assets?: { asset: number; amount: number }[]; points?: number }[],
    status: number
}