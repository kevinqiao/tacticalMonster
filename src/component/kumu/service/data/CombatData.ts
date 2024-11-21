const attributes = {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
}
const stats = {
    hp: { current: 0, max: 10 },
    mp: { current: 0, max: 10 },
    stamina: { current: 0, max: 10 },
    attack: 0,
    defense: 0,
    speed: 0,
    crit_rate: 0,
    evasion: 0
}
export const players = [
    {
        uid: "1",
        name: "test1",
        characters: [
            {
                character_id: "1",
                uid: "1",
                level: 1,
                attributes,
                stats,
                position: { x: 0, y: 1 },
                asset: "/assets/hero_baboon.png",
                move_range: 3,
                attackRange: { min: 1, max: 1 },
            },
            {
                character_id: "2",
                uid: "1",
                level: 1,
                attributes,
                stats,
                position: { x: 1, y: 4 },
                asset: "/assets/hero_tiger.png",
                move_range: 2,
                attack_range: { min: 1, max: 4 },
            },
            {
                character_id: "3",
                uid: "1",
                level: 1,
                attributes,
                stats,
                position: { x: 2, y: 6 },
                asset: "/assets/hero_tiger.png",
                movementRange: 2,
                attackRange: { min: 3, max: 6 },
            },
        ],
    },
    {
        uid: "2",
        name: "test2",
        characters: [
            { character_id: "1", attributes, level: 1, uid: "2", stats, position: { x: 6, y: 2 }, asset: "/assets/hero_elephant.png", movementRange: 2 },
            { character_id: "2", attributes, level: 1, uid: "2", stats, position: { x: 5, y: 5 }, asset: "/assets/hero_rhino.png", movementRange: 2 },
        ],
    },
];
export const allObstacles = [
    { row: 0, col: 3, asset: "/assets/obstacle1.png" },
    { row: 2, col: 4, asset: "/assets/obstacle2.png" },
];
