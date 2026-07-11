import { gsap } from 'gsap';
import type { RefObject } from 'react';
import { popCard } from './animation/effects/popCard';
import type { SoloBoardDimension, SoloCard, SoloGameState } from './types/SoloTypes';
import { getCardCoord, soloCardZIndex } from './Utils';

export function layoutSoloCardFromModel(
    card: SoloCard,
    gameState: SoloGameState,
    boardDimension: SoloBoardDimension,
    boardDimensionRef: RefObject<SoloBoardDimension | null>
): void {
    if (!card.ele || !boardDimensionRef.current) return;
    const width = boardDimension.cardWidth;
    const height = boardDimension.cardHeight;
    const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId);
    const coord = getCardCoord(card, zoneCards, boardDimensionRef);
    const x = Math.round(coord.x);
    const y = Math.round(coord.y);
    const rotateY = card.isRevealed && card.zone !== 'talon' ? 180 : 0;
    popCard(card);
    const stackZ = soloCardZIndex(card, zoneCards);
    const cx = Number(gsap.getProperty(card.ele, 'x'));
    const cy = Number(gsap.getProperty(card.ele, 'y'));
    const samePos =
        Number.isFinite(cx) &&
        Number.isFinite(cy) &&
        Math.hypot(cx - x, cy - y) < 1.2;
    if (samePos) {
        gsap.set(card.ele, { autoAlpha: 1, width, height, rotateY, zIndex: stackZ, force3D: false });
    } else {
        gsap.set(card.ele, {
            autoAlpha: 1,
            width,
            height,
            x,
            y,
            rotateY,
            zIndex: stackZ,
            force3D: false,
        });
    }
}

export function layoutAllSoloCardsFromModel(
    gameState: SoloGameState,
    boardDimension: SoloBoardDimension,
    boardDimensionRef: RefObject<SoloBoardDimension | null>
): void {
    for (const card of gameState.cards) {
        layoutSoloCardFromModel(card, gameState, boardDimension, boardDimensionRef);
    }
}
