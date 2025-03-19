
import { BoardDimension, Card, GameModel } from "./types/CombatTypes";
export const getSoloBoardDimension = (boardWidth: number, boardHeight: number) => {
    //type 0: solo, 1: dual
    const padding = 20;
    const zwidth = boardWidth * 3 / 7;
    const zheight = boardHeight / 3;
    const top = boardHeight / 3;
    const left = boardWidth * 5.8 / 7;
}
export const getDualBoardZones = (boardWidth: number, boardHeight: number) => {
    //type 0: solo, 1: dual
    const padding = 20;
    const z0: { top: number, left: number, width: number, height: number, cwidth: number, cheight: number, margin: { t: number, l: number, r: number, b: number } } = { top: 0, left: 0, width: 0, height: 0, cwidth: 0, cheight: 0, margin: { t: 0, l: 0, r: 0, b: 0 } }
    const z1: { top: number, left: number, width: number, height: number, cwidth: number, cheight: number, margin: { t: number, l: number, r: number, b: number } } = { top: 0, left: 0, width: 0, height: 0, cwidth: 0, cheight: 0, margin: { t: 0, l: 0, r: 0, b: 0 } }
    const z2: { top: number, left: number, width: number, height: number, cwidth: number, cheight: number, margin: { t: number, l: number, r: number, b: number } } = { top: 0, left: 0, width: 0, height: 0, cwidth: 0, cheight: 0, margin: { t: 0, l: 0, r: 0, b: 0 } }
    const z3: { top: number, left: number, width: number, height: number, cwidth: number, cheight: number, margin: { t: number, l: number, r: number, b: number } } = { top: 0, left: 0, width: 0, height: 0, cwidth: 0, cheight: 0, margin: { t: 0, l: 0, r: 0, b: 0 } }
    z0['top'] = boardHeight * 3 / 8;
    z0['left'] = 0;
    z0['width'] = boardWidth * 4 / 7;
    z0['height'] = boardHeight / 4;

    z1['width'] = boardWidth - z0['width'];
    z1['height'] = z0['height'];
    const r1 = z1['height'] / (z1['width'] - padding * 3) / 2;
    z1['cwidth'] = r1 > 1.5 ? (z1['width'] - padding * 3) / 2.5 : z1['height'] / 1.8
    z1['cheight'] = z1['cwidth'] * 1.5
    z1['top'] = z0['top'];
    z1['left'] = z0['width'];

    z2['top'] = z0['top'] + z0['height'];
    z2['left'] = z0['left'];
    z2['width'] = boardWidth;
    z2['height'] = boardHeight * 3 / 8;
    z3['top'] = 0;
    z3['left'] = 0;
    z3['width'] = boardWidth;
    z3['height'] = boardHeight * 3 / 8;
    const r3 = z3['height'] / (z3['width'] - padding * 8) / 7;
    z3['cwidth'] = r3 > 2.1 ? (z3['width'] - padding * 8) / 7 : z3['height'] / 1.9 / 1.5
    z3['cheight'] = z3['cwidth'] * 1.5
    z2['cwidth'] = z3['cwidth']
    z2['cheight'] = z3['cheight']
    z2['margin'] = { t: z2['cheight'] * 0.1, l: (z3['width'] - z3['cwidth'] * 7) / 8, r: 0, b: 0 }
    z3['margin'] = z2['margin']

    const r0 = z0['height'] / (z0['width'] - padding * 5) / 4;
    z0['cwidth'] = r0 > 1.5 ? (z0['width'] - padding * 5) / 4 : z0['height'] / 1.5
    z0['cheight'] = z0['cwidth'] * 1.5


    z1['margin'] = { t: (z1['height'] - z1['cheight']) / 2, r: 20, l: 0, b: 0 }

    return { 0: z0, 1: z1, 2: z2, 3: z3 }

}
export const getCardCoord = (card: Card, game: GameModel, boardDimension: BoardDimension, direction: number = 0) => {
    // console.log("card", card, direction);
    const { field, col, row } = card;
    const zoneNo: number = (!field || field < 2) ? field || 0 : (direction === 0 ? field : (field === 2 ? 3 : 2));
    const zone = boardDimension.zones[zoneNo];
    const { cwidth, cheight } = zone;
    const x = zone.left + (zoneNo === 1 ? zone['cwidth'] * 2 : zone['margin']['l'] + zone['margin']['l'] * (col || 0) + cwidth * (col || 0))
    const y = zone.top + (zoneNo === 0 || zoneNo === 1 ? (zone['height'] - zone['cheight']) / 2 : (zoneNo === 2 ? zone['margin']['t'] : zone['height'] - zone['cheight'] - zone['margin']['t']) + (zoneNo === 2 ? 1 : -1) * zone['cheight'] * 0.15 * (row || 0))
    const cord = { x, y, cwidth, cheight, zIndex: row || 0 }

    if (zoneNo && zoneNo === 1) {
        if (card.status === 1) {
            const openCards = game.cards?.filter((c: Card) => c.field && c.field === 1 && c.status === 1);
            const index = openCards?.findIndex((c) => c.id === card.id);
            cord['zIndex'] = index || 0;
            cord['x'] = zone['left'] + (index || 0) * zone['cwidth'] / 2;
        } else {
            const zIndex = game.cards?.findIndex((c: Card) => c.id === card.id);
            if (zIndex != undefined) {
                cord['zIndex'] = 500 - zIndex;
            }
        }
    } else {
        cord['zIndex'] = card.row || 0;
    }
    return cord;
}
export const getDeckCoord = (boardDimension: BoardDimension) => {
    const { zones } = boardDimension;
    const zone = zones[1];
    const { left, top, cwidth, cheight } = zone;
    const x = left + cwidth * 2;
    const y = top + (zone['height'] - zone['cheight']) / 2;
    return { x, y, cwidth, cheight, zIndex: 0 }

}

