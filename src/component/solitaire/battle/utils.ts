
import { Card } from "./types/CombatTypes";

export const getCardCoord = (card: Card, boardWidth: number, boardHeight: number) => {
    const { zone, col, row } = card;
    const padding = 20;
    const zwidth = !zone ? boardWidth * 2 / 3 : (zone === 1 ? boardWidth * 3 / 7 : boardWidth);
    const zheight = boardHeight / 3;
    const top = !zone || zone === 1 ? 0 : boardHeight / 3;
    const left = !zone || zone === 2 ? 0 : boardWidth * 5.8 / 7;
    const h = boardHeight / 3;
    const w = !zone ? (zwidth - padding * 2) / 3 : (zone === 1 ? (zwidth - padding * 4) / 3 : (zwidth - padding * 8) / 7);
    const cwidth = h / w > 1.5 ? w : h / 1.5
    const cheight = cwidth * 1.5
    const hmargin = !zone ? (zwidth - cwidth * 4 - padding * 2) / 3 : (zone === 1 ? (zwidth - cwidth * 2 - padding * 2) / 2 : (zwidth - 7 * cwidth - padding * 2) / 6);
    const vmargin = !zone || zone === 1 ? (zheight - cheight) / 2 : 0;
    const x = left + padding + cwidth * (col || 0) + hmargin * (col || 0)
    const y = top + vmargin + 10 * (row || 0);
    const cord = { x, y, cwidth, cheight, zIndex: row || 0 }
    return cord;
}


