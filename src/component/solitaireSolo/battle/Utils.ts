import { SoloBoardDimension, SoloCard, ZoneType } from "./types/SoloTypes";

export const getCoord = (card: SoloCard, boardDimension: SoloBoardDimension) => {
    if (!boardDimension || !card.ele) return { x: 0, y: 0 };
    switch (card.zone) {
        case ZoneType.TALON: {
            const x = boardDimension.zones.talon.x
            const y = boardDimension.zones.talon.y
            return { x, y };
        }
        case ZoneType.WASTE: {
            const x = boardDimension.zones.waste.x
            const y = boardDimension.zones.waste.y
            return { x, y };
        }
        case ZoneType.TABLEAU: {
            const colIndex = +card.zoneId.split('-')[1];
            const x = boardDimension.zones.tableau.x + colIndex * (boardDimension.cardWidth + boardDimension.spacing);
            const y = boardDimension.zones.tableau.y + card.zoneIndex * (boardDimension.cardHeight * 0.3);
            return { x, y };
        }
        case ZoneType.FOUNDATION: {
            const x = boardDimension.zones.foundations.x
            const y = boardDimension.zones.foundations.y
            return { x, y };
        }
    }
}

