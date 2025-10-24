import { ActionResult, ActionStatus, ActMode, Card, SoloActionData, SoloCard, SoloGameStatus, ZoneType } from "component/solitaireSolo";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../../../convex/solitaireArena/convex/_generated/api";
import { dealEffect } from "../../animation/effects/dealEffect";
import { PlayEffects } from "../../animation/PlayEffects";
import { useSoloGameManager } from "../GameManager";
import { SoloGameEngine } from "../SoloGameEngine";

const useActHandler = () => {
    const convex = useConvex();
    const { ruleManager, gameState, boardDimension } = useSoloGameManager();
    const onSave = useCallback((cards: Card[]) => {
        if (!gameState) return;
        cards.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
            // console.log('update card', card);
        });

    }, [gameState]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        if (!gameState || !ruleManager) return;
        const { dropTarget, card, actModes } = data;
        if (!card || !actModes?.includes(ActMode.DRAG)) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }

        gameState.actionStatus = ActionStatus.DROPPING;
        console.log("onDrop", data);
        if (dropTarget && ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
            moveCard(data);
            return;
        }
        cancelDrag(data);

    }, [gameState, boardDimension]);
    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!ruleManager || !gameState) return;
        const { card } = data;
        if (!card) {
            gameState.actionStatus = ActionStatus.IDLE;
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
            gameState.actionStatus = ActionStatus.IDLE;
        }
        return
    }, [gameState, boardDimension]);

    const recycle = useCallback(() => {
        if (!gameState) return;
        gameState.actionStatus = ActionStatus.ACTING;
        const talonCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'talon');
        if (talonCards.length > 0)
            return;
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste');
        if (wasteCards.length === 0)
            return;
        const cards = gameState.cards.filter((c: SoloCard) => c.zoneId === "waste").sort((a: SoloCard, b: SoloCard) => b.zoneIndex - a.zoneIndex).map((c: SoloCard, index: number) => {
            return { ...c, zoneIndex: index, zoneId: "talon", zone: ZoneType.TALON };
        });

        PlayEffects.recycle({
            data: { gameState, boardDimension, cards },
            onComplete: () => {
                onSave(cards);
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });
    }, [gameState, boardDimension])
    const deal = useCallback(async (effectType: 'default' | 'fan' | 'spiral' | 'wave' | 'explosion' = 'default') => {
        if (!gameState) return;
        gameState.actionStatus = ActionStatus.ACTING;
        const dealResult = await convex.mutation(api.service.gameManager.deal, { gameId: gameState.gameId });
        // console.log("dealResult", dealResult);
        if (dealResult && dealResult.ok) {
            const dealedCards = dealResult.data?.update || [];
            console.log("dealedCards", dealedCards, effectType);
            dealEffect({
                effectType: effectType,
                data: { cards: dealedCards, gameState, boardDimension },
                onComplete: () => {
                    onSave(dealedCards);
                    gameState.status = SoloGameStatus.START;
                    gameState.actionStatus = ActionStatus.IDLE;
                }
            });
        }
        // const dealedCards = SoloGameEngine.deal(gameState.cards);

    }, [gameState, boardDimension]);

    const cancelDrag = useCallback((data: SoloActionData) => {
        if (!data || !data.card) return;
        PlayEffects.dragCancel({
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimension }, onComplete: () => {
                if (gameState) {
                    gameState.actionStatus = ActionStatus.IDLE;
                }
            }
        });
    }, [gameState, boardDimension]);
    const drawCard = useCallback(async (data: SoloActionData) => {

        const { card } = data;
        if (!gameState || !ruleManager || !card) return;
        const toDraw = SoloGameEngine.drawCard(gameState, card.id);
        if (!toDraw.ok) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }
        if (toDraw.data?.draw && toDraw.data.draw.length > 0) {
            PlayEffects.hideCard({ data: { card: toDraw.data.draw[0] as SoloCard } })
        }
        // 任务1: 手动控制 resolve 的查询 Promise
        const queryPromise = new Promise<void>((resolve) => {
            convex.mutation(api.service.gameManager.draw, { gameId: gameState.gameId, cardId: card.id })
                .then((result: ActionResult) => {
                    if (result.ok && result.data?.draw && result.data.draw.length > 0) {
                        const drawedCard = result.data.draw[0] as SoloCard;
                        PlayEffects.popCard({ data: { card: drawedCard, gameState } })
                        onSave([drawedCard]);
                        resolve();
                    } else {
                        resolve();
                    }
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve(); // 失败时也 resolve，确保 Promise.all 继续执行
                });
        });
        const drawedCardPromise = new Promise<void>((resolve) => {
            PlayEffects.drawCard({
                data: { card: toDraw.data?.draw?.[0], boardDimension, gameState }, onComplete: () => {
                    resolve();
                }
            });
        })

        await Promise.all([queryPromise, drawedCardPromise]);
        gameState.actionStatus = ActionStatus.IDLE;
        return;
    }, [gameState, boardDimension]);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, cards, dropTarget } = data;
        if (!gameState || !ruleManager || !card || !dropTarget) return;
        // if (!card || !dropTarget || !ruleManager.canMoveToZone(card as Card, dropTarget.zoneId)) {
        //     gameState.actionStatus = ActionStatus.IDLE;
        //     return;
        // }

        const result = SoloGameEngine.moveCard(gameState, card as Card, dropTarget.zoneId);
        if (!result.ok) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }
        const tasks: { task1: boolean, task2: boolean, task3: boolean } = { task1: true, task2: false, task3: false };

        // 任务1: 手动控制 resolve 的查询 Promise
        const queryPromise = new Promise<void>((resolve) => {

            convex.mutation(api.service.gameManager.move, { gameId: gameState.gameId, cardId: card.id, toZone: dropTarget.zoneId })
                .then((result: ActionResult) => {
                    console.log("result", result);
                    tasks.task1 = true;
                    const flipCards: SoloCard[] = result.data?.flip || [];
                    if (flipCards.length > 0) {
                        const fcard = gameState.cards.find((c: SoloCard) => c.id === flipCards[0].id);
                        if (fcard) {
                            flipCards[0].ele = fcard.ele;
                        }
                        PlayEffects.flipCard({
                            data: { card: flipCards[0], boardDimension },
                            onComplete: () => { onSave(flipCards); resolve(); }
                        });
                    } else
                        resolve(); // 成功时 resolve
                })
                .catch((error) => {
                    console.error('move card failed:', error);
                    resolve(); // 失败时也 resolve，确保 Promise.all 继续执行
                });
        });

        // 任务2: 手动控制 resolve 的动画 Promise
        const animationPromise = new Promise<void>((resolve) => {
            PlayEffects.moveCard({
                data: { boardDimension, gameState, cards: result.data?.move || [] },
                onComplete: () => { tasks.task2 = true; onSave(result.data?.move || []); resolve(); } // 动画完成时 resolve
            });
        });
        // 任务3: 手动控制 resolve 的 reset 动画 Promise
        const resetCards = gameState.cards.filter((c: SoloCard) => c.zoneId === card.zoneId && c.zoneIndex < card.zoneIndex);

        const resetPromise = new Promise<void>((resolve) => {
            PlayEffects.resetZone({
                data: { cards: resetCards, boardDimension },
                onComplete: () => { tasks.task3 = true; resolve(); }
            });
        });

        // 等待两个操作都完成
        await Promise.all([queryPromise, animationPromise, resetPromise]);
        console.log("tasks", tasks);
        // onUpdate([...flipCards, ...(result.data?.update || [])]);
        gameState.actionStatus = ActionStatus.IDLE;
    }, [gameState, boardDimension]);


    return { onClickOrTouch, onDrop, recycle, deal };
};

export default useActHandler;


