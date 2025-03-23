
import { BoardDimension } from "./types/CombatTypes";
export type Slot = {
    index: number,
    top: number,
    left: number,
    width: number,
    height: number,
}
export type Zone = {
    index: number,
    top: number,
    left: number,
    width: number,
    height: number,
    cwidth: number,
    cheight: number,
    slots: Slot[],
}
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
    z0['top'] = boardHeight * 5 / 12;
    z0['left'] = 0;
    z0['width'] = boardWidth * 4 / 7;
    z0['height'] = boardHeight / 6;


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
    z2['height'] = boardHeight * 5 / 12;
    z3['top'] = 0;
    z3['left'] = 0;
    z3['width'] = boardWidth;
    z3['height'] = z2['height'];
    const r3 = z3['height'] / (z3['width'] - padding * 8) / 7;
    z3['cwidth'] = r3 > 3 ? (z3['width'] - padding * 8) / 7 : z3['height'] / 3 / 1.5
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
export const cardCoord = (field: number, col: number, row: number, boardDimension: BoardDimension, direction: number = 0) => {

    const zoneNo: number = (!field || field < 2) ? field || 0 : (direction === 0 ? field : (field === 2 ? 3 : 2));
    const zone = boardDimension.zones[zoneNo];
    const { cwidth, cheight, slots } = zone;
    const slot = slots.find(s => s.index === col);
    if (!slot) return { x: 0, y: 0, cwidth: 0, cheight: 0, zIndex: 0 };
    const x = slot.left + slot.width * 0.05;
    const y = slot.top + (zoneNo < 2 ? cheight * 0.05 : (zoneNo === 2 ? cheight * 0.05 + cheight * 0.2 * row : slot.height - cheight - cheight * 0.2 * row))
    const cord = { x, y, cwidth: slot.width * 0.9, cheight: slot.width * 0.9 * 1.5, zIndex: row }
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
export const createZoneSlots = (zone: Zone) => {
    const slots: Slot[] = [];
    if (zone.index === 0) {
        for (let i = 0; i < 4; i++) {
            slots.push({
                index: i,
                top: zone.top,
                left: zone.left + zone.cwidth * i,
                width: zone.cwidth,
                height: zone.cheight,
            })
        }
    }
    if (zone.index === 1) {
        for (let i = 0; i < 3; i++) {
            slots.push({
                index: i,
                top: zone.top,
                left: zone.left + i * zone.cwidth / 2,
                width: zone.cwidth,
                height: zone.cheight,
            })
        }
        slots.push({
            index: -1,
            top: zone.top,
            left: zone.left + zone.cwidth * 2,
            width: zone.cwidth,
            height: zone.height,
        })
    }
    if (zone.index === 2) {
        for (let i = 0; i < 7; i++) {
            slots.push({
                index: i,
                top: zone.top,
                left: zone.left + zone.cwidth * i,
                width: zone.cwidth,
                height: zone.height,
            })
        }
    }
    if (zone.index === 3) {
        for (let i = 0; i < 7; i++) {
            slots.push({
                index: i,
                top: 0,
                left: zone.left + zone.cwidth * i,
                width: zone.cwidth,
                height: zone.height,
            })
        }
    }
    return slots;
}

export const getBoardZone = (index: number, boardWidth: number, boardHeight: number) => {
    const zone: Zone = {
        index: index,
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        cwidth: 0,
        cheight: 0,
        slots: [],
    }
    if (index === 0) {
        zone.top = boardHeight * 5 / 12;
        zone.left = 0;
        zone.width = boardWidth * 4 / 7;
        zone.height = boardHeight / 6;
        if (zone.height / (zone.width / 4) > 1.5) {
            zone.cwidth = zone.width / 4;
            zone.cheight = zone.cwidth * 1.5;
        } else {
            zone.cheight = zone.height;
            zone.cwidth = zone.cheight / 1.5;
        }
    }
    if (index === 1) {
        zone.top = boardHeight * 5 / 12;
        zone.left = boardWidth * 4 / 7;
        zone.width = boardWidth * 3 / 7;
        zone.height = boardHeight / 6;
        if (zone.height / (zone.width / 3) > 1.5) {
            zone.cwidth = zone.width / 3;
            zone.cheight = zone.cwidth * 1.5;
        } else {
            zone.cheight = zone.height;
            zone.cwidth = zone.cheight / 1.5;
        }
    }
    if (index === 2) {
        zone.top = boardHeight * 7 / 12;
        zone.left = 0;
        zone.width = boardWidth;
        zone.height = boardHeight * 5 / 12;
        zone.cwidth = zone.width / 7;
        zone.cheight = zone.cwidth * 1.5;
    }
    if (index === 3) {
        zone.top = 0;
        zone.left = 0;
        zone.width = boardWidth;
        zone.height = boardHeight * 5 / 12;
        zone.cwidth = zone.width / 7;
        zone.cheight = zone.cwidth * 1.5;
    }
    return zone;
}
export const createDualZones = (dimension: BoardDimension) => {
    const { width, height } = dimension;
    const zones: { [k: number]: Zone } = {};
    for (let i = 0; i < 4; i++) {
        const zone: Zone = getBoardZone(i, width, height);
        const slots: Slot[] = createZoneSlots(zone);
        zone.slots = slots;
        zones[i] = zone;
    }
    dimension.zones = zones;
}
