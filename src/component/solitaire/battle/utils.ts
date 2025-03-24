
import { BoardDimension, Slot, Zone } from "./types/CombatTypes";


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
    const slot: Slot | undefined = boardDimension.zones[1].slots.find(slot => slot.index === -1);
    if (!slot) return { index: 1, top: 0, left: 0, width: 0, height: 0 };
    return slot;
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
