
export const allPlayers = [
    {
        uid: "1",
        characters: [
            {
                id: 1,
                uid: "1",
                speed: 1,
                position: { x: 0, y: 1 },
                asset: "/assets/hero_baboon.png",
                movementRange: 3,
                attackRange: { min: 1, max: 1 },
            },
            {
                id: 2,
                uid: "1",
                speed: 2,
                position: { x: 1, y: 4 },
                asset: "/assets/hero_tiger.png",
                movementRange: 2,
                attackRange: { min: 1, max: 4 },
            },
            {
                id: 3,
                uid: "1",
                speed: 3,
                position: { x: 2, y: 6 },
                asset: "/assets/hero_tiger.png",
                movementRange: 2,
                attackRange: { min: 3, max: 6 },
            },
        ],
    },
    {
        uid: "2",
        characters: [
            { id: 1, uid: "2", speed: 1, position: { x: 6, y: 2 }, asset: "/assets/hero_elephant.png", movementRange: 2 },
            { id: 2, uid: "2", speed: 2, position: { x: 5, y: 5 }, asset: "/assets/hero_rhino.png", movementRange: 2 },
        ],
    },
];
export const allObstacles = [
    { row: 0, col: 3, asset: "/assets/obstacle1.png" },
    { row: 2, col: 4, asset: "/assets/obstacle2.png" },
];