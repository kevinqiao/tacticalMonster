import { SoloGameEngine } from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import type { SolitaireRecordedOp } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { RefObject } from "react";
import { PlayEffects } from "../animation/PlayEffects";
import { SOLO_ANIMATION_CONFIG } from "../animation/animationConfig";
import { Card, SoloBoardDimension, SoloCard, SoloGameState, ZoneType } from "../types/SoloTypes";
import { resolveMoveCardForOp } from "./solitaireRolloutReplay";

export type PlayRolloutAnimationOptions = {
  gameState: SoloGameState;
  boardDimensionRef: RefObject<SoloBoardDimension | null>;
  op: SolitaireRecordedOp;
  saveUpdate: (cards: SoloCard[]) => void;
  autoFoundationMove?: boolean;
};

function talonTopCard(state: SoloGameState): SoloCard | undefined {
  return state.cards
    .filter((c) => c.zone === ZoneType.TALON)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0] as SoloCard | undefined;
}

/**
 * Apply one recorded op on live state and run the same PlayEffects path as useActHandler (no Convex).
 */
export function playRolloutOpAnimation(opts: PlayRolloutAnimationOptions): Promise<boolean> {
  const { gameState, boardDimensionRef, op, saveUpdate, autoFoundationMove } = opts;

  if (op.op === "draw") {
    const top = talonTopCard(gameState);
    if (!top) return Promise.resolve(false);
    const drawResult = SoloGameEngine.drawCard(gameState, top.id);
    const drawnCards = drawResult.data?.draw ?? [];
    if (drawnCards.length === 0) return Promise.resolve(false);

    const drawnWithEle = drawnCards.map((c) => {
      const dom = gameState.cards.find((gc) => gc.id === c.id);
      return { ...c, ele: dom?.ele } as SoloCard;
    });

    return new Promise((resolve) => {
      PlayEffects.drawCard({
        data: { cards: drawnWithEle, boardDimensionRef, gameState },
        onComplete: () => {
          saveUpdate(drawnWithEle);
          resolve(true);
        },
      });
    });
  }

  if (op.op === "recycle") {
    const result = SoloGameEngine.recycle(gameState);
    const cards = result.data?.update ?? [];
    if (!result.ok || cards.length === 0) return Promise.resolve(false);

    const cardsWithEle = cards.map((c) => {
      const live = gameState.cards.find((gc) => gc.id === c.id);
      return { ...c, ele: live?.ele } as SoloCard;
    });

    return new Promise((resolve) => {
      PlayEffects.recycle({
        data: { gameState, boardDimensionRef, cards: cardsWithEle },
        onComplete: () => {
          saveUpdate(cardsWithEle);
          resolve(true);
        },
      });
    });
  }

  if (op.op === "move") {
    const card = resolveMoveCardForOp(gameState, op);
    if (!card) return Promise.resolve(false);

    const result = SoloGameEngine.moveCard(gameState, card as Card, op.to);
    if (!result.ok) return Promise.resolve(false);

    const moveData = result.data?.move ?? [];
    const flipCards = result.data?.flip ?? [];
    const moveWithEle = moveData.map((c) => {
      const live = gameState.cards.find((gc) => gc.id === c.id);
      return { ...c, ele: live?.ele } as SoloCard;
    });
    const updateCards = [...moveWithEle, ...flipCards];

    return new Promise((resolve) => {
      const finishMove = () => {
        PlayEffects.moveCard({
          data: {
            boardDimensionRef,
            gameState,
            moveCards: moveWithEle,
            targetZoneId: op.to,
          },
          onComplete: () => {
            saveUpdate(updateCards);
            resolve(true);
          },
        });
      };

      if (flipCards.length > 0) {
        const flipPayload = flipCards[0] as SoloCard;
        const domCard = gameState.cards.find((c) => c.id === flipPayload.id);
        if (domCard?.ele) flipPayload.ele = domCard.ele;
        if (flipPayload.ele) {
          PlayEffects.flipCard({
            data: {
              card: flipPayload,
              gameState,
              ...(autoFoundationMove || op.to.startsWith("foundation-")
                ? { duration: SOLO_ANIMATION_CONFIG.duration.flip.autoFoundation }
                : {}),
            },
            onComplete: finishMove,
          });
          return;
        }
      }
      finishMove();
    });
  }

  return Promise.resolve(false);
}
