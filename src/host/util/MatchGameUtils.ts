import { CellItem } from '../model/CellItem';
import { GameModel } from '../model/GameModel';
import { GAME_GOAL } from '../model/Match3Constants';
import candy_textures from '../model/candy_textures';
import { MatchItem } from '../service/GameEngine';
import * as Utils from "./Utils";
export const checkSwipe = (grid: CellItem[][]): boolean => {
    const rows = grid.length;
    const columns = grid[0].length;
    for (let row = 0; row < rows; row++) {
        let col = 0;
        let start = grid[row][0];
        let units: CellItem[] = [];
        while (col < columns) {
            if (!grid[row][col])
                console.log("row:" + row + ";col:" + col + " is null")
            if (grid[row][col].asset === start.asset) {
                units.push(grid[row][col])
            } else {
                if (units.length >= 3) {
                    return true;
                }
                start = grid[row][col]
                units = [start]
            }
            col++; // Move to the next column if no match was found
        }
        if (units.length >= 3) {
            return true
        }
    }

    for (let col = 0; col < columns; col++) {
        let row = 0;
        let start = grid[0][col];
        let units: CellItem[] = [];
        while (row < rows) {
            // console.log(col + "," + row + ";" + grid[row][col].asset + ":" + start.asset + ":" + units.length)
            if (grid[row][col].asset === start.asset) {
                units.push(grid[row][col])
            } else {
                if (units.length >= 3) {
                    return true;
                }
                start = grid[row][col]
                units = [start]
            }
            row++; // Move to the next column if no match was found
        }
        if (units.length >= 3) {
            return true;
        }
    }

    return false;
}


export const hasMatch3 = (grid: CellItem[][]): boolean => {

    // console.log(grid.flatMap((r) => r))
    const rows = grid.length;
    const columns = grid[0].length;
    for (let row = 0; row < rows; row++) {
        const units: CellItem[] = [];
        for (let col = 0; col < columns; col++) {
            // console.log(grid[row][col])
            units.push(grid[row][col])
            if (col === columns - 1 || grid[row][col].asset !== grid[row][col + 1].asset) {
                if (units.length >= 3) return true;
                units.length = 0;
            }
        }
    }
    for (let col = 0; col < columns; col++) {
        const units: CellItem[] = [];
        for (let row = 0; row < rows; row++) {
            // console.log(grid[row][col])
            units.push(grid[row][col])
            if (row === rows - 1 || grid[row][col].asset !== grid[row + 1][col].asset) {
                if (units.length >= 3) {
                    return true;
                }
                units.length = 0;
            }
        }
    }
    return false;
}
// export const findMatch3 = (grid: CellItem[][]): MatchItem[] => {
//     let id = 0;
//     const rows = grid.length;
//     const columns = grid[0].length;
//     const matches: MatchItem[] = [];
//     for (let row = 0; row < rows; row++) {
//         const units: CellItem[] = [];
//         for (let col = 0; col < columns; col++) {
//             if (grid[row][col].status) continue;
//             units.push(grid[row][col])
//             if (col === columns - 1 || grid[row][col].asset !== grid[row][col + 1].asset || grid[row][col + 1].status) {
//                 if (units.length >= 3) {
//                     id++;
//                     matches.push({ id, units: [...units], start: { row, column: units[0]['column'] }, end: { row, column: units[units.length - 1]['column'] }, orientation: "horizontal", size: units.length })
//                 }
//                 units.length = 0;
//             }
//         }
//     }


//     for (let col = 0; col < columns; col++) {
//         const units: CellItem[] = [];
//         for (let row = 0; row < rows; row++) {
//             if (grid[row][col].status) continue;
//             units.push(grid[row][col])
//             if (row === rows - 1 || grid[row][col].asset !== grid[row + 1][col].asset || grid[row + 1][col].status) {
//                 if (units.length >= 3) {
//                     id++;
//                     matches.push({ id, units: [...units], start: { row: units[0]['row'], column: col }, end: { row: units[units.length - 1]['row'], column: col }, orientation: "vertical", size: units.length })
//                 }
//                 units.length = 0;
//             }
//         }
//     }
//     return matches;
// }
// export const findMatch3Plus = (grid: CellItem[][]): MatchItem[] => {
//     let id = 0;
//     const rows = grid.length;
//     const columns = grid[0].length;
//     const matches: MatchItem[] = [];
//     for (let row = 0; row < rows; row++) {
//         const units: CellItem[] = [];
//         for (let col = 0; col < columns; col++) {
//             if (grid[row][col].status) continue;
//             units.push(grid[row][col])
//             if (col === columns - 1 || grid[row][col].asset !== grid[row][col + 1].asset || grid[row][col + 1].status) {
//                 if (units.length > 3) {
//                     id++;
//                     matches.push({ id, units: [...units], start: { row, column: units[0]['column'] }, end: { row, column: units[units.length - 1]['column'] }, orientation: "horizontal", size: units.length })
//                 }
//                 units.length = 0;
//             }
//         }
//     }


//     for (let col = 0; col < columns; col++) {
//         const units: CellItem[] = [];
//         for (let row = 0; row < rows; row++) {
//             if (grid[row][col].status) continue;
//             units.push(grid[row][col])
//             if (row === rows - 1 || grid[row][col].asset !== grid[row + 1][col].asset || grid[row + 1][col].status) {
//                 if (units.length > 3) {
//                     id++;
//                     matches.push({ id, units: [...units], start: { row: units[0]['row'], column: col }, end: { row: units[units.length - 1]['row'], column: col }, orientation: "vertical", size: units.length })
//                 }
//                 units.length = 0;
//             }
//         }
//     }
//     return matches;
// }
export const findMatch = (grid: CellItem[][], size: number): MatchItem[] => {
    let id = 0;
    const rows = grid.length;
    const columns = grid[0].length;
    const matches: MatchItem[] = [];
    for (let row = 0; row < rows; row++) {
        const units: CellItem[] = [];
        for (let col = 0; col < columns; col++) {
            const status = grid[row][col]['status'] ?? 0;
            if (status > 0 || grid[row][col].asset > 20) continue;
            units.push(grid[row][col])
            if (col === columns - 1 || grid[row][col].asset !== grid[row][col + 1].asset || grid[row][col + 1].status || grid[row][col + 1].asset > 20) {
                if (units.length === size) {
                    id++;
                    matches.push({ id, units: [...units], start: { row, column: units[0]['column'] }, end: { row, column: units[units.length - 1]['column'] }, orientation: "horizontal", size: units.length })
                }
                units.length = 0;
            }
        }
    }


    for (let col = 0; col < columns; col++) {
        const units: CellItem[] = [];
        for (let row = 0; row < rows; row++) {
            if (grid[row][col].status) continue;
            units.push(grid[row][col])
            if (row === rows - 1 || grid[row][col].asset !== grid[row + 1][col].asset || grid[row + 1][col].status) {
                if (units.length === size) {
                    id++;
                    matches.push({ id, units: [...units], start: { row: units[0]['row'], column: col }, end: { row: units[units.length - 1]['row'], column: col }, orientation: "vertical", size: units.length })
                }
                units.length = 0;
            }
        }
    }
    return matches;
}
export const checkMove = (cells: CellItem[], rows: number, columns: number) => {
    cells.sort((a: CellItem, b: CellItem) => a.row !== b.row ? a.row - b.row : a.column - b.column)
    const grid: CellItem[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
    for (const unit of cells) {
        grid[unit.row][unit.column] = { ...unit };
    }
    const candy = grid[0][0];
    const target = grid[0][1];
    // console.log(JSON.parse(JSON.stringify(grid)));
    // [candy.row, target.row] = [target.row, candy.row];
    [candy.column, target.column] = [target.column, candy.column];
    grid[0][0] = target;
    grid[0][1] = candy;

    // console.log(JSON.parse(JSON.stringify(candy)));
    // console.log(JSON.parse(JSON.stringify(target)));
    // console.log(JSON.parse(JSON.stringify(grid)));


}
export const findMove = (cells: CellItem[], rows: number, columns: number): { candy: CellItem, target: CellItem }[] => {
    cells.sort((a: CellItem, b: CellItem) => a.row !== b.row ? a.row - b.row : a.column - b.column)
    const grid: CellItem[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
    for (const unit of cells) {
        grid[unit.row][unit.column] = { ...unit };
    }
    const moves: { candy: CellItem, target: CellItem }[] = []

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns - 1; col++) {
            let canMove = false;
            const candy = grid[row][col];
            const target = grid[row][col + 1];
            // [candy.row, target.row] = [target.row, candy.row];
            [candy.column, target.column] = [target.column, candy.column];
            grid[row][col] = target;
            grid[row][col + 1] = candy;
            if (hasMatch3(grid))
                canMove = true;
            grid[row][col] = candy;
            grid[row][col + 1] = target;
            [target.column, candy.column] = [candy.column, target.column];
            if (canMove)
                moves.push({ candy, target })
        }
    }

    for (let col = 0; col < columns; col++) {
        for (let row = 0; row < rows - 1; row++) {
            let canMove = false;
            const candy = grid[row][col];
            const target = grid[row + 1][col];
            [candy.row, target.row] = [target.row, candy.row];
            grid[row][col] = target;
            grid[row + 1][col] = candy;
            if (hasMatch3(grid))
                canMove = true;
            grid[row][col] = candy;
            grid[row + 1][col] = target;
            [target.row, candy.row] = [candy.row, target.row];

            if (canMove)
                moves.push({ candy, target })
        }
    }

    return moves
}

export const getFreeCandy = (seed: string, cellId: number) => {
    const random = Utils.getNthRandom(seed, cellId);
    // const index = Math.floor(random * (candy_textures.length - 10));
    const index = Math.floor(random * 10);
    const asset = candy_textures[index]["id"] ?? 0;
    const candy = { id: cellId, asset, column: -1, row: -1 };
    return candy
}
export const getRandomAsset = (seed: string, cellId: number) => {
    const random = Utils.getNthRandom(seed, cellId);
    // const index = Math.floor(random * (candy_textures.length - 10));
    const index = Math.floor(random * 10);
    const asset = candy_textures[index]["id"] ?? 0;
    return asset;
}
export const countBaseScore = (matched: { asset: number, quantity: number }[]): number => {
    if (matched)
        return matched.reduce((s: number, a: { asset: number; quantity: number }) => s + a.quantity, 0);
    return 0;
}

export const solveGoalChanges = (goalId: number, prematched: { asset: number, quantity: number }[], curmatched: { asset: number, quantity: number }[]): { asset: number, from: number, to: number }[] => {
    if (goalId) {
        const goalObj = GAME_GOAL.find((g) => g.id === goalId);
        if (goalObj) {
            const changes: { asset: number; from: number; to: number }[] = []
            for (const item of goalObj.goal) {
                const pre = prematched.find((a) => a.asset === item.asset);
                const cur = curmatched.find((a) => a.asset === item.asset);
                if (cur) {
                    let from = item.quantity;
                    if (pre)
                        from = Math.max(from - pre.quantity, 0);
                    const to = Math.max(item.quantity - cur.quantity, 0);
                    if (from > to)
                        changes.push({ asset: item.asset, from, to })
                }
            }
            return changes;
        }
    }
    return [];
}
export const countMatched = (game: GameModel, result: { toChange: CellItem[]; toCreate: CellItem[]; toMove: CellItem[]; toRemove: CellItem[]; toSmesh?: { target: number; candy: CellItem; smesh: CellItem[] }[][] }[]): { skillBuff: { skill: number; progress: number }[]; matched: { asset: number; quantity: number }[] } => {
    const skillBuff: { skill: number; progress: number }[] = [];
    const matched: { asset: number; quantity: number }[] = [];
    for (const res of result) {

        const { toChange, toRemove, toSmesh } = res;
        toChange.forEach((c) => {
            const m = matched.find((m) => m.asset === c.src);
            m ? m.quantity++ : matched.push({ asset: c.asset, quantity: 1 });
        })
        toRemove.forEach((c) => {
            const m = matched.find((m) => m.asset === c.asset);
            m ? m.quantity++ : matched.push({ asset: c.asset, quantity: 1 });
        })
        const s1 = skillBuff.find((s) => s.skill === 1);
        if (!s1) {
            skillBuff.push({ skill: 1, progress: toRemove.length * 3 })
        } else {
            s1.progress = s1.progress + toRemove.length * 3;
        }

        const s2 = skillBuff.find((s) => s.skill === 2);
        if (!s2) {
            skillBuff.push({ skill: 2, progress: Math.floor(toRemove.length) })
        } else {
            s2.progress = s2.progress + Math.floor(toRemove.length);
        }

        if (toSmesh) {
            for (const s of toSmesh) {
                s.forEach((c) => {
                    const items: CellItem[] = c.smesh;
                    items.forEach((c) => {
                        const m = matched.find((m) => m.asset === c.asset);
                        m ? m.quantity++ : matched.push({ asset: c.asset, quantity: 1 });
                    })
                })
            }
            const s3 = skillBuff.find((s) => s.skill === 3);
            if (!s3)
                skillBuff.push({ skill: 3, progress: toSmesh.length * 10 })
            else
                s3.progress = s3.progress + toSmesh.length * 10;
        }

    }

    if (!game.data.skillBuff)
        game.data.skillBuff = [];
    skillBuff.forEach((sk) => {
        const sb = game.data.skillBuff.find((s: { skill: number; progress: number }) => s.skill === sk.skill)
        if (sb)
            sb.progress = Math.min(sb.progress + sk.progress, 100)
        else
            game.data.skillBuff.push(sk)
    })

    if (!game.data.matched)
        game.data.matched = [];
    matched.forEach((m) => {
        const ma = game.data.matched.find((mm: { asset: number; quantity: number }) => mm.asset === m.asset)
        if (ma)
            ma.quantity = ma.quantity + m.quantity;
        else
            game.data.matched.push(m)
    })

    return { matched, skillBuff }
}

