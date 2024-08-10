import { Tournament } from "../model/Tournament";

export const tournaments: Tournament[] = [
    {
        id: "1",
        battleTime: 300000,
        cost: [{ amount: 100, asset: 1 }],
        goal: 1,
        participants: 2,
        rewards: [
            { assets: [{ amount: 100, asset: 3 }], rank: 1 },
            { assets: [{ amount: 100, asset: 3 }], rank: 2 },
        ],
        type: 0,
        status: 0,
    },
    {
        id: "2",
        battleTime: 300000,
        cost: [{ amount: 100, asset: 2 }],
        currentTerm: 1,
        goal: 1,
        participants: 2,
        rewards: [
            { points: 100, rank: 0 },
            { points: 100, rank: 1 },
        ],
        type: 1,
        status: 0
    }
]
