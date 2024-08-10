import { BattleModel, BattleReward } from '../model/Battle';
import { CellItem } from "../model/CellItem";
import { GAME_STATUS } from "../model/Constants";
import { GameEvent } from '../model/GameEvent';
import { GameModel } from '../model/GameModel';
import { GAME_ACTION, GAME_EVENT, GAME_GOAL, getEventByAct } from '../model/Match3Constants';
import { Tournament } from '../model/Tournament';
import { countMatched, findMatch, findMove, getFreeCandy, getRandomAsset, hasMatch3 } from '../util/MatchGameUtils';
import { getRandom, getRandomSeed } from '../util/Utils';

export type Match = {
    type: number;//0-LINE  1-T 2-L 
    size: number;
    status?: number;
    items: MatchItem[]
};
export type MatchItem = {
    id?: number;
    units: CellItem[];
    start: { row: number; column: number };
    end: { row: number; column: number };
    orientation: 'horizontal' | 'vertical' | 'T' | 'L';
    size: number;
    status?: number;//0-active 1-inactive
};

export const createGame = (diffcult: { column: number; row: number; chunk: number; goal: number }): { seed: string; data: { cells: CellItem[]; lastCellId: number } } | null => {
    const { row, column } = diffcult;
    const grid: CellItem[][] = [];
    let done = false;
    let id = 0;
    let gameData: { seed: string; data: { cells: CellItem[]; lastCellId: number } } | null = null;
    let seed = getRandomSeed(10);

    while (!done) {

        for (let y = 0; y < row; y++) {
            grid[y] = [];
            for (let x = 0; x < column; x++) {
                const asset: number = getRandomAsset(seed, id);
                grid[y][x] = { id, row: y, column: x, asset }
                id++;
            }
        }

        gameData = { seed, data: { cells: grid.flatMap((r) => r), lastCellId: id } }
        resolveMatch(gameData.seed, gameData.data, row, column);

        const moves: { candy: CellItem, target: CellItem }[] = findMove(gameData.data.cells, row, column);
        console.log("moves size:" + moves.length)
        if (moves.length > 1)
            done = true;
        else
            seed = getRandomSeed(10);
    }
    return gameData
}
export const checkGoalComplete = (game: any, goalId: number): boolean => {
    const goalModel = GAME_GOAL.find((g: { id: number, steps: number; goal: { asset: number, quantity: number }[] }) => g.id === goalId);
    if (goalModel && game.data.matched) {
        const goalSuccess = goalModel.goal.map((g) => {
            const m = game.data.matched.find((m: { asset: number; quantity: number }) => m.asset === g.asset);
            const quantity = m ? g.quantity - m.quantity : g.quantity;
            return { asset: g.asset, quantity };
        }).every((r) => r.quantity <= 0);
        return goalSuccess;
    }
    return false;
}
export const settleGame = (game: any): { base: number; time: number; goal: number } | null => {
    if (game.result) return game.result
    let result = null;

    if (game.data.matched) {
        const baseScore = game.data.matched.reduce((s: number, a: { asset: number; quantity: number }) => s + a.quantity, 0);
        const timeScore = game.data.goalCompleteTime ? Math.floor(game.data.goalCompleteTime / 1000) : 0;
        const goalScore = game.data.goalCompleteTime ? 100 : 0;
        const score = baseScore + timeScore + goalScore;
        result = { base: baseScore, time: timeScore, goal: goalScore }
        game['result'] = result;
        game['score'] = score;
        game['status'] = GAME_STATUS.SETTLED;

    } else {
        game['result'] = { base: 0, time: 0, goal: 0 };
        game['score'] = 0;
        game['status'] = GAME_STATUS.SETTLED;
    }
    return result
}

export const handleEvent = (name: string, eventData: any, game: any) => {

    if (name === GAME_EVENT.SWIPE_CANDY || name === GAME_EVENT.SKILL_SWAP) {
        const candy: CellItem | undefined = game.data.cells.find((c: CellItem) => c.id === eventData.candy.id);
        const target: CellItem | undefined = game.data.cells.find((c: CellItem) => c.id === eventData.target.id);
        if (candy && target) {
            [candy.row, target.row] = [target.row, candy.row];
            [candy.column, target.column] = [target.column, candy.column];
        }
    }

    if (eventData?.results)
        for (const result of eventData.results) {
            applyShiftResult(result, game.data)
        }
    if (eventData.gameData)
        Object.assign(game.data, eventData.gameData)
}

export const countRewards = (tournament: Tournament, battle: BattleModel): BattleReward[] => {
    const rewards: BattleReward[] = [];
    if (battle.status === 0 && battle.games && battle.games.length > 0) {
        battle.games.sort((a: any, b: any) => b.score - a.score).forEach((r: any, index: number) => {
            const reward = tournament.rewards?.find((w) => w.rank === index);
            if (reward) {
                rewards.push({ uid: r.uid, gameId: r._id, rank: index, score: r.score, assets: reward.assets });
            } else
                rewards.push({ uid: r.uid, gameId: r._id, rank: index, score: r.score, assets: [] });
        })
    }
    return rewards;
}
export const handleSwipe = (game: GameModel, battle: BattleModel, data: any): any => {
    if (!game.seed) return;
    const actionResult: any = {};
    const { row, column } = battle.data;
    const results: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[]; toSmesh?: { target: number; candy: CellItem; smesh?: CellItem[] }[][] }[] = []
    const smeshIds = [28, 29, 30, 31];
    const grid: CellItem[][] = Array.from({ length: row }, () => Array(column).fill(null));

    const { candyId, targetId } = data;
    const candy: CellItem | null = game.data.cells.find((c: CellItem) => c.id === candyId);
    const target: CellItem | null = game.data.cells.find((c: CellItem) => c.id === targetId);
    if (!candy || !target) return null;

    actionResult['data'] = { candy, target };
    [candy.row, target.row] = [target.row, candy.row];
    [candy.column, target.column] = [target.column, candy.column];
    for (const unit of game.data.cells) {
        grid[unit.row][unit.column] = { ...unit };
    }

    const toSmesh: { target: number; candy: CellItem; smesh?: CellItem[] }[][] = [];
    if (smeshIds.includes(candy.asset)) {
        const meshes: { target: number; candy: CellItem; smesh?: CellItem[] }[] = [];
        const targetAsset = smeshIds.includes(target.asset) ? -1 : target.asset;
        solveSmesh(grid, candy, targetAsset, meshes);
        toSmesh.push(meshes);

    }
    if (smeshIds.includes(target.asset)) {
        const meshes: { target: number; candy: CellItem; smesh?: CellItem[] }[] = [];
        const targetAsset = smeshIds.includes(candy.asset) ? -1 : candy.asset;
        solveSmesh(grid, target, targetAsset, meshes);
        toSmesh.push(meshes)
    }

    const plus4Changes = solveMatch(grid, 5, 7);
    const crossChanges = solveCrossMatch(grid);
    const fourChanges = solveMatch(grid, 3, 4);
    const toChange = [...plus4Changes, ...crossChanges, ...fourChanges];

    // if (isPre) {
    //     const res = firstMatch(grid);
    //     const result = { ...res, toChange, toSmesh }
    //     results.push(result);
    //     actionResult['result'] = results;
    //     return actionResult;
    // } else {
    const res = shiftMatch(game.seed, game.data, grid);
    const result = { ...res, toChange, toSmesh }

    results.push(result);
    applyShiftResult(result, game.data);

    const matchResults = resolveMatch(game.seed, game.data, row, column);
    results.push(...matchResults);
    actionResult['result'] = results;
    return actionResult;
    // }
}

export const handleSmash = (game: GameModel, battle: BattleModel, data: any): any => {
    if (!game.seed) return;
    // console.log("handle smash")
    const actionResult: any = {};
    const { row, column } = battle.data;
    const results: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[]; toSmesh?: { target: number; candy: CellItem; smesh?: CellItem[] }[][] }[] = []
    const smeshIds = [28, 29, 30, 31];

    const { candyId } = data;

    const candy: CellItem | null = game.data.cells.find((c: CellItem) => c.id === candyId);
    if (!candy || !smeshIds.includes(candy.asset)) return null;
    actionResult['data'] = { candy };

    const grid: CellItem[][] = Array.from({ length: row }, () => Array(column).fill(null));
    for (const unit of game.data.cells) {
        grid[unit.row][unit.column] = { ...unit };
    }
    const plus4Changes = solveMatch(grid, 5, 7);
    const crossChanges = solveCrossMatch(grid);
    const fourChanges = solveMatch(grid, 3, 4);
    const toChange = [...plus4Changes, ...crossChanges, ...fourChanges]

    const toSmesh: { target: number; candy: CellItem; smesh?: CellItem[] }[][] = [];
    const meshes: { target: number; candy: CellItem; smesh?: CellItem[] }[] = [];
    solveSmesh(grid, candy, -1, meshes);
    toSmesh.push(meshes);

    const res = shiftMatch(game.seed, game.data, grid);
    const result = { ...res, toChange, toSmesh }
    results.push(result);
    applyShiftResult(result, game.data);

    const matchResults = resolveMatch(game.seed, game.data, row, column);
    results.push(...matchResults);
    actionResult['result'] = results;
    return actionResult;
}
export const handleSkillHammer = (game: GameModel, battle: BattleModel, data: any): any => {
    if (!game.seed) return;
    const actionResult: any = {};
    const { row, column } = battle.data;
    const { candyId } = data;
    const candy: CellItem | null = game.data.cells.find((c: CellItem) => c.id === candyId);
    if (!candy) return;
    actionResult['data'] = { candy: { ...candy } };
    candy.status = 1;
    const grid: CellItem[][] = Array.from({ length: row }, () => Array(column).fill(null));
    for (const unit of game.data.cells) {
        grid[unit.row][unit.column] = { ...unit };
    }
    const res = shiftMatch(game.seed, game.data, grid)
    const result = { ...res, toChange: [] };
    applyShiftResult(result, game.data);
    const matchResults = resolveMatch(game.seed, game.data, row, column);
    actionResult['result'] = [result, ...matchResults];
    return actionResult;
}

export const handleSkillSpray = (game: GameModel, battle: BattleModel, data: any): any => {
    if (!game.seed) return;
    // console.log("handle skill spray")
    const actionResult: any = {};
    const { row, column } = battle.data;
    // const results: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[]; toSmesh?: { target: number; candy: CellItem; smesh?: number[] }[][] }[] = []
    const { candyId } = data;
    const candy: CellItem | null = game.data.cells.find((c: CellItem) => c.id === candyId);
    const targets = game.data.cells.filter((c: CellItem) => c.asset === candy?.asset);
    targets.forEach((t: CellItem) => t.status = 1);

    const grid: CellItem[][] = Array.from({ length: row }, () => Array(column).fill(null));
    for (const unit of game.data.cells) {
        grid[unit.row][unit.column] = { ...unit };
    }
    const res = shiftMatch(game.seed, game.data, grid);
    const result = { ...res, toChange: [] };

    applyShiftResult(result, game.data);
    actionResult['data'] = { candy };
    const matchResults = resolveMatch(game.seed, game.data, row, column);
    actionResult['result'] = [result, ...matchResults];
    return actionResult;
}
const resetSkill = (game: GameModel, skill: number) => {
    if (game.data.skillBuff) {
        const buff = game.data.skillBuff.find((s: { skill: number; progress: number }) => s.skill === skill);
        if (buff)
            buff.progress = 0;
    }
}
const canUseSkill = (game: GameModel, skill: number): boolean => {
    if (game.data.skillBuff) {
        const buff = game.data.skillBuff.find((s: { skill: number; progress: number }) => s.skill === skill);
        if (buff.progress >= 100)
            return true;

    }
    return false
}
export const executeAct = (game: GameModel, battle: BattleModel, action: { act: number; data: any }): any => {
    if (!game.seed) return;
    let actionResult: any = null;

    switch (action.act) {
        case GAME_ACTION.SWIPE_CANDY:
            actionResult = handleSwipe(game, battle, action.data);
            game.data.move ? game.data.move++ : game.data.move = 1;
            break;
        case GAME_ACTION.SMASH_CANDY:
            actionResult = handleSmash(game, battle, action.data);
            game.data.move ? game.data.move++ : game.data.move = 1;

            break;
        case GAME_ACTION.SKILL_HAMMER:
            if (canUseSkill(game, 1)) {
                actionResult = handleSkillHammer(game, battle, action.data);
                resetSkill(game, 1)
            }
            break;
        case GAME_ACTION.SKILL_SPRAY:

            if (canUseSkill(game, 3)) {
                actionResult = handleSkillSpray(game, battle, action.data);
                resetSkill(game, 3)
            }
            break;
        case GAME_ACTION.SKILL_SWAP:
            if (canUseSkill(game, 2)) {
                actionResult = handleSwipe(game, battle, action.data);
                resetSkill(game, 2)
            }
            break;
        default:
            break;
    }
    // console.log(actionResult)
    if (actionResult.result)
        countMatched(game, actionResult.result);

    return actionResult;
}

const resolveMatch = (seed: string, data: { cells: CellItem[], lastCellId: number }, rows: number, columns: number): { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[] }[] => {
    const results: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[] }[] = [];
    const grid: CellItem[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
    for (const unit of data.cells) {
        grid[unit.row][unit.column] = { ...unit };
    }

    while (hasMatch3(grid)) {
        const plus4Changes = solveMatch(grid, 5, 7);
        const crossChanges = solveCrossMatch(grid);
        const fourChanges = solveMatch(grid, 3, 4);
        const res = shiftMatch(seed, data, grid);
        const result = { ...res, toChange: [...plus4Changes, ...crossChanges, ...fourChanges] }
        results.push(result);
        applyShiftResult(result, data);
        for (const unit of data.cells) {
            grid[unit.row][unit.column] = { ...unit };
        }
    }
    return results;
}

const solveMatch = (grid: CellItem[][], min: number, max: number): CellItem[] => {
    const toChange: CellItem[] = [];
    for (let i = max; i >= min; i--) {
        const matches: MatchItem[] = findMatch(grid, i);
        for (const m of matches) {
            if (m.units.filter((u) => u.status).length === 0) {
                if (m.size === 4) {
                    toChange.push({ ...m.units[0], src: m.units[0].asset, asset: m.orientation === "horizontal" ? 28 : 29 });

                } else if (m.size >= 5) {
                    toChange.push({ ...m.units[0], src: m.units[0].asset, asset: 31 })
                }
                m.units.forEach((u, index) => {
                    if (m.size === 3 || (m.size >= 4 && index > 0)) u.status = 1
                })
            }
        }
    }
    return toChange;
}




const solveCrossMatch = (grid: CellItem[][]): CellItem[] => {
    const toChange: CellItem[] = [];
    const match4: MatchItem[] = findMatch(grid, 4)
    const match3: MatchItem[] = findMatch(grid, 3);
    const matches = [...match4, ...match3]

    for (const match of matches) {
        if (!match.status) {
            const ls = matches.find((m) => match.id !== m.id && !m.status && m.units.find((obj1) => match.units.some(obj2 => obj1['id'] === obj2['id'])));

            if (ls) {
                const conn = match.units.find((mu) => ls.units.some((lu) => lu.id === mu.id));
                if (conn) {
                    toChange.push({ ...conn, asset: 30 });
                    match.units.forEach((u) => {
                        if (u.id !== conn.id)
                            u.status = 1
                    });
                    ls.units.forEach((u) => {
                        if (u.id !== conn.id)
                            u.status = 1
                    });
                    ls.status = 1;
                }
            }
            match.status = 1;
        }
    }
    return toChange;
}

const solveSmesh = (grid: CellItem[][], candy: CellItem, target: number, allMeshes: { target: number; candy: CellItem, smesh?: CellItem[] }[]) => {

    const row = grid.length;
    const column = grid[0].length;
    const smeshIds = [28, 29, 30, 31];
    const smesh: CellItem[] = [];
    switch (candy.asset) {
        case 29:
            allMeshes.push({ target, candy, smesh });
            for (let i = 0; i < row; i++) {
                const c = grid[i][candy.column];
                c.status = 2;
                smesh.push(c);
                if (i !== candy.row && smeshIds.includes(c.asset))
                    solveSmesh(grid, c, -1, allMeshes)
            }
            break;
        case 28:
            allMeshes.push({ target, candy, smesh });
            for (let i = 0; i < column; i++) {
                const c = grid[candy.row][i];
                c.status = 2;
                smesh.push(c);
                if (i !== candy.column && smeshIds.includes(c.asset))
                    solveSmesh(grid, c, -1, allMeshes)
            }
            break;
        case 30:
            allMeshes.push({ target, candy, smesh });
            {

                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const row = i + candy['row'];
                        const col = j + candy['column'];
                        if (row >= 0 && col >= 0) {
                            if ((i !== 0 || j !== 0) && smeshIds.includes(grid[row][col].asset))
                                solveSmesh(grid, grid[row][col], -1, allMeshes)
                            grid[row][col].status = 2;
                            smesh.push(grid[row][col]);
                        }
                    }
                }

            }
            break;
        case 31:
            {

                let asset = target;
                if (target < 0) {
                    const candies = grid.flatMap((r) => r);
                    const cs = candies.filter((c) => !c.status);
                    const c = candies[getRandom(cs.length)];
                    asset = c.asset;
                }
                const targets: CellItem[] = grid.flatMap((r) => r).filter((c: CellItem) => c.asset === asset || c.id === candy.id);
                targets.forEach((c) => c.status = 2)
                smesh.push(...targets);
                allMeshes.push({ target: asset, candy, smesh })
            }
            break;
        default:
            break;
    }
    return;
}

const shiftMatch = (seed: string, data: { lastCellId: number }, grid: CellItem[][]) => {
    const toMove: CellItem[] = [];
    const toCreate: CellItem[] = [];
    const columns = grid[0].length;
    const cells = grid.flatMap((row) => row);

    for (let column = 0; column < columns; column++) {
        const toColCreate: CellItem[] = [];
        const colRemoved = cells.filter((c: any) => c.column === column && c.status > 0);
        for (const r of colRemoved) {

            const candy = getFreeCandy(seed, data.lastCellId++);
            toColCreate.push(candy);
            candy.column = column;
            candy.row = colRemoved.length - toColCreate.length;

            const toMoves: CellItem[] = cells.filter((c: CellItem) => !c.status && c.column === column && c.row < r.row);
            toMoves.forEach((ms) => {
                const tm = toMove.find((m) => m.id === ms.id);
                if (tm) {
                    tm.row++;
                } else
                    toMove.push({ ...ms, row: ms.row + 1 })
            })

        }
        toCreate.push(...toColCreate)
    }

    const toRemove: CellItem[] = cells.filter((c: CellItem) => c.status === 1);
    return { toRemove, toCreate, toMove }


}
export const localAct = (act: number, data: any, game: GameModel, battle: BattleModel): GameEvent | null => {

    const actionResult: { data: any; result: any; gameData: { lastCellId: number; matched: CellItem[], move?: number, skillBuff?: { skill: number; quantity: number }[] } } = executeAct(game, battle, { act, data });
    if (actionResult) {
        const eventName = getEventByAct(act);
        // console.log("event name:" + eventName)
        const steptime = Math.round(Date.now() - battle['startTime']);
        if (eventName) {
            const event: GameEvent = {
                name: eventName, data: { ...actionResult.data, results: actionResult.result, gameData: { ...game.data, cells: undefined } }, steptime
            }
            return event;
        }
    }
    return null;
}
const applyShiftResult = (
    result: { toCreate: CellItem[]; toChange: CellItem[]; toRemove: CellItem[]; toMove: CellItem[]; toSmesh?: { target: number; candy: CellItem; smesh?: CellItem[] }[][] },
    data: { cells: CellItem[] }
) => {
    data.cells.sort((a: CellItem, b: CellItem) => {
        if (a.row === b.row) return a.column - b.column;
        else return a.row - b.row;
    });

    const { toCreate, toChange, toRemove, toMove, toSmesh } = result;
    if (toRemove) {
        const acells: CellItem[] = data.cells.filter((c: CellItem) => {
            const cr = toRemove.find((r) => r.id === c.id);
            if (cr) return false;
            else return true;
        });
        data.cells.length = 0;
        data.cells.push(...acells);
    }
    if (toSmesh) {
        const smeshs: { target: number; candy: CellItem; smesh?: CellItem[] }[] = toSmesh.flat();
        const smeshIds: number[] = [];
        smeshs.forEach((s) => {
            if (s.smesh) {
                smeshIds.push(...s.smesh.map((s) => s.id))
            }
        })
        const scells: CellItem[] = data.cells.filter((c: CellItem) => !smeshIds.includes(c.id));
        data.cells = scells;
    }

    if (toCreate?.length > 0) {
        data.cells.push(...toCreate);
    }

    if (toChange) {
        toChange.forEach((c) => {
            const cell = data.cells.find((s: CellItem) => s.id === c.id);
            if (cell) {
                cell.asset = c.asset;
                cell.column = c.column;
                cell.row = c.row;
            }
        });
    }

    if (toMove) {
        for (const m of toMove) {
            const cell = data.cells.find((c: CellItem) => c.id === m.id);
            if (cell) {
                cell.column = m.column;
                cell.row = m.row;
            }
        }
    }
};


