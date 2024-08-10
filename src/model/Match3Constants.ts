export const TOURNAMENT_BATTLE_TYPE = {
    GROUP: 0,
    PvP: 1,
    SINGLE: 2,
};
export const MOVE_DIRECTION = {
    RIGHT: 1,
    LEFT: 3,
    UP: 4,
    DOWN: 2
};
export const MATCH_DIRECTION = {
    HORIZATION: 1,
    VERTICAL: 2
};


export const GAME_MODE = {
    PLAY: 0,
    REPLAY: 1,
    VIEW: 2
}

export const CANDY_SMASH_TYPE = {
    LINE: 1,
    EXPLODE: 2,
    FLY: 3,
    SQUASH: 4,
    DIG: 5,
    OTHER: 6
}
export const CANDY_MATCH_TYPE = {
    LINE: 0,
    TMODEL: 1,
    LMODEL: 2,
}
export const SCENE_EVENT_TYPE = {
    INIT: 1,
    UPDATE: 2
}

export const SCENE_NAME = {
    BATTLE_LOADING: "loading_battle",
    BATTLE_MATCHING: "matching_battle",
    // BATTLE_CONSOLE: "battle_console",
    BATTLE_GROUND: "battle_ground",
    // BATTLE_FRONT: "battle_front",
    BATTLE_SCENE: "battle_scene",
    BATTLE_SEARCH: "battle_search",
    GAME_SCENES: "game_scenes",
    BATTLE_CONSOLE: "battle_console",
    GAME_CONSOLE_SCENES: "game_console_scenes"
}
export const SCENE_ID = {
    GAME_SCENE: 1,
    GAME_CONSOLE_SCENE: 2,
    BATTLE_SCENE: 3,
    BATTLE_GROUND_SCENE: 4,
    BATTLE_CONSOLE_SCENE: 5,
}
export const SCENE_TYPE = {
    PIXI_APPLICATION: 0,
    HTML_DIVELEMENT: 1
}
export const GAME_EVENT = {
    SWIPE_CANDY: "cellSwapped",
    SMASH_CANDY: "cellSmeshed",
    SKILL_HAMMER: "skillHammer",
    SKILL_SWAP: "skillSwap",
    SKILL_SPRAY: "skillSpray",
    GAME_OVER: "gameOver",
    GOAL_COMPLETE: "goalComplete",
} as { [key: string]: string };



export const GAME_ACTION = {
    SKILL_HAMMER: 1,
    SKILL_SWAP: 2,
    SKILL_SPRAY: 3,
    SWIPE_CANDY: 4,
    SMASH_CANDY: 5,
} as { [key: string]: number };

export const GAME_GOAL =
    [
        { id: 1, steps: 10, goal: [{ asset: 0, quantity: 3 }, { asset: 1, quantity: 3 }, { asset: 3, quantity: 10 }] },
        { id: 2, steps: 10, goal: [{ asset: 0, quantity: 10 }, { asset: 1, quantity: 10 }, { asset: 2, quantity: 10 }, { asset: 3, quantity: 10 }] },
        { id: 3, steps: 10, goal: [{ asset: 0, quantity: 10 }, { asset: 1, quantity: 10 }, { asset: 2, quantity: 10 }, { asset: 3, quantity: 10 }] },
    ]

export const getEventByAct = (act: number): string | null => {
    for (const [key, val] of Object.entries(GAME_ACTION)) {
        if (val === act) {
            return GAME_EVENT[key];
        }
    }
    return null
}
export const isGameActEvent = (eventName: string): boolean => {

    for (const [key, val] of Object.entries(GAME_EVENT)) {
        if (val === eventName && val !== "gameOver") {
            return true;
        }
    }
    return false;
}
