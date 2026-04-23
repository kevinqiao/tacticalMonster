import { ActionResult, ActMode, Card, GameInteractionPhase, SoloActionData, SoloCard, SoloGameStatus, ZoneType } from "component/battle/games/solitaireSolo";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/solitaireArena/convex/_generated/api";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import { useSoloGameManager } from "../GameManager";
import { SoloGameEngine } from "../SoloGameEngine";

const useActHandler = () => {
    const convex = useConvex();
    const { timelines, ruleManager, gameState, boardDimension, boardDimensionRef, setInteractionPhase } = useSoloGameManager();
    const saveUpdate = useCallback((cards: Card[]) => {
        if (!gameState) return;
        cards.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
        });

    }, [gameState]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        if (!gameState || !ruleManager) return;
        const { dropTarget, card, actModes } = data;
        if (!card || !actModes?.includes(ActMode.DRAG)) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }

        setInteractionPhase(GameInteractionPhase.animating);
        console.log("onDrop", data);
        if (dropTarget && ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            moveCard(data);
            return;
        }
        cancelDrag(data);

    }, [gameState, ruleManager, setInteractionPhase]);
    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!ruleManager || !gameState) return;
        const { card } = data;
        if (!card) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const target = ruleManager?.findTarget(card as Card);
        if (target) {
            if (card.zoneId === ZoneType.TALON) {
                drawCard(data);
            } else {
                moveCard({ ...data, dropTarget: target });
            }
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }
        return
    }, [gameState, ruleManager, setInteractionPhase]);

    const recycle = useCallback(async () => {
        if (!gameState) return;
        setInteractionPhase(GameInteractionPhase.animating);

        const result = SoloGameEngine.recycle(gameState);
        if (!result.ok) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        const cards = result.data?.update || [];
        const recyclePromise = new Promise<void>((resolve) => {

            convex.mutation(api.service.gameManager.recycle, { gameId: gameState.gameId })
                .then((result: ActionResult) => {
                    console.log("recycle result", result);
                    resolve();
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve();
                });
        });
        const playPromise = new Promise<void>((resolve) => {
            PlayEffects.recycle({
                timelines,
                data: { gameState, boardDimensionRef, cards },
                onComplete: () => {
                    saveUpdate(cards);
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            });
        })
        await Promise.all([recyclePromise, playPromise]);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
    }, [gameState, boardDimensionRef, convex, timelines, saveUpdate, setInteractionPhase])
    const deal = useCallback(async (effectType: 'default' | 'fan' | 'spiral' | 'wave' | 'explosion' = 'default') => {
        if (!gameState) return;
        setInteractionPhase(GameInteractionPhase.animating);
        const dealResult = await convex.mutation(api.service.gameManager.deal, { gameId: gameState.gameId });
        if (dealResult && dealResult.ok) {
            const dealedCards = dealResult.data?.update || [];
            console.log("dealedCards", dealedCards, effectType);
            dealEffect({
                timelines,
                effectType: effectType,
                data: { cards: dealedCards, gameState, boardDimension },
                onComplete: () => {
                    saveUpdate(dealedCards);
                    gameState.status = SoloGameStatus.DEALED;
                    setInteractionPhase(GameInteractionPhase.idle);
                }
            });
        } else {
            setInteractionPhase(GameInteractionPhase.idle);
        }

    }, [gameState, boardDimension, convex, timelines, saveUpdate, setInteractionPhase]);

    const cancelDrag = useCallback((data: SoloActionData) => {
        console.log("cancelDrag", data);
        if (!data || !data.card) return;
        setInteractionPhase(GameInteractionPhase.animating);
        PlayEffects.dragCancel({
            timelines,
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimensionRef }, onComplete: () => {
                setInteractionPhase(GameInteractionPhase.idle);
            }
        });
    }, [gameState, boardDimensionRef, timelines, setInteractionPhase]);
    const drawCard = useCallback(async (data: SoloActionData) => {

        const { card } = data;
        if (!gameState || !ruleManager || !card) return;
        setInteractionPhase(GameInteractionPhase.animating);
        const drawResult = SoloGameEngine.drawCard(gameState, card.id);
        const drawedCard = drawResult.data?.draw?.[0];
        if (!drawedCard) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        let updateCards: SoloCard[] = [];
        const drawPromise = new Promise<void>((resolve) => {
            convex.mutation(api.service.gameManager.draw, { gameId: gameState.gameId, cardId: card.id })
                .then((result: ActionResult) => {
                    console.log("draw server result", result);
                    if (result.ok && result.data?.draw && result.data.draw.length > 0) {
                        const revealedCard = result.data.draw[0] as SoloCard;
                        updateCards.push(...result.data.draw);
                        PlayEffects.popCard({
                            timelines,
                            data: { card: revealedCard, gameState }, onComplete: () => {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve();
                });
        });
        const playPromise = new Promise<void>((resolve) => {
            PlayEffects.drawCard({
                timelines,
                data: { card: drawedCard as SoloCard, boardDimensionRef, gameState }, onComplete: () => {
                    resolve();
                }
            });
        })
        await Promise.all([drawPromise, playPromise]);
        console.log("updateCards", updateCards);
        saveUpdate(updateCards);
        setInteractionPhase(GameInteractionPhase.idle);
        return;
    }, [ruleManager, gameState, boardDimensionRef, convex, timelines, saveUpdate, setInteractionPhase]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, cards, dropTarget } = data;
        if (!gameState || !ruleManager || !card || !dropTarget) return;

        const result = SoloGameEngine.moveCard(gameState, card as Card, dropTarget.zoneId);
        console.log("moveCard result", result);
        if (!result.ok) {
            setInteractionPhase(GameInteractionPhase.idle);
            return;
        }
        setInteractionPhase(GameInteractionPhase.animating);
        const movedCards = result.data?.move || [];

        const movePromise = new Promise<void>((resolve) => {

            convex.mutation(api.service.gameManager.move, { gameId: gameState.gameId, cardId: card.id, toZone: dropTarget.zoneId })
                .then((result: ActionResult) => {
                    console.log("result", result);
                    const flipCards: SoloCard[] = result.data?.flip || [];
                    if (flipCards.length > 0) {
                        const fcard = gameState.cards.find((c: SoloCard) => c.id === flipCards[0].id);
                        if (fcard) {
                            flipCards[0].ele = fcard.ele;
                        }
                        PlayEffects.flipCard({
                            timelines,
                            data: { card: flipCards[0] },
                            onComplete: () => { saveUpdate(flipCards); resolve(); }
                        });
                    } else
                        resolve();
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve();
                });
        });

        const playPromise = new Promise<void>((resolve) => {
            PlayEffects.moveCard({
                timelines,
                data: { boardDimensionRef, gameState, cards: movedCards },
                onComplete: () => { saveUpdate(movedCards); resolve(); }
            });
        });

        await Promise.all([movePromise, playPromise]);

        setInteractionPhase(GameInteractionPhase.idle);
    }, [gameState, boardDimensionRef, ruleManager, convex, timelines, saveUpdate, setInteractionPhase]);


    return { onClickOrTouch, onDrop, recycle, deal, cancelDrag };
};

export default useActHandler;

