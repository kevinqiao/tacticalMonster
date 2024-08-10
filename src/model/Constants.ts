

export const BATTLE_LOAD = {
    PLAY: 0,
    RELOAD: 1,
    REPLAY: 2,
}

export const GAME_MODE = {
    PLAY: 0,
    REPLAY: 1,
    VIEW: 2
}
export const STACK_PAGE_DIRECTION = {
    TOP: 1,
    LEFT: 4,
    BOTTOM: 3,
    RIGHT: 2,
    CENTER: 0
}

// export const CANDY_SMASH_TYPE = {
//     LINE: 1,
//     EXPLODE: 2,
//     FLY: 3,
//     SQUASH: 4,
//     DIG: 5,
//     OTHER: 6
// }
// export const CANDY_MATCH_TYPE = {
//     LINE: 0,
//     TMODEL: 1,
//     LMODEL: 2,
// }
export const BATTLE_DURATION = 180000

export const SCENE_TYPE = {
    PIXI_APPLICATION: 0,
    HTML_DIVELEMENT: 1
}

export const BATTLE_EVENT = {
    BATTLE_RELOAD: "battleReload",
    BATTLE_PAUSE: "battlePause"
};

export const APP_EVENT = {
    REWARD_CLAIM: "claimReward",
};

export const GAME_STATUS = {
    OPEN: 0,
    SETTLED: 1,
    CLAIMED: 2
    // REWARD: 2,
    // REWARD_DISPATCHED: 3
}
export const BATTLE_STATUS = {
    OPEN: 0,
    SETTLED: 1
}

export const CHANNEL_AUTH = {
    CLERK: 0,
    TELEGRAM_BOT: 1,
    THIRD_WEB: 2,
};
export const GAME_TYPE = {
    MATCH3: 1,
    KUMU: 2,
    SOLITAIRE: 3
}
export const BATTLE_SEARCH_MAX_TIME = 2500;
export const BATTLE_COUNT_DOWN_TIME = 10000;
