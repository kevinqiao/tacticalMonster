import { ActionStatus, Card, SoloActionData, SoloCard, SoloZone, ZoneType } from "component/solitaireSolo";
import { useConvex } from "convex/react";
import { useCallback } from "react";
import { PlayEffects } from "../../animation/PlayEffects";
import { useSoloGameManager } from "../GameManager";

const useActHandler = () => {
    const convex = useConvex();
    const { gameState, boardDimension } = useSoloGameManager();

    const onUpdate = useCallback((result: Card[]) => {
        if (!gameState) return;
        result.forEach((r: SoloCard) => {
            const card = gameState.cards.find((c: SoloCard) => c.id === r.id);
            if (card) {
                card.isRevealed = r.isRevealed;
                card.zone = r.zone;
                card.zoneId = r.zoneId;
                card.zoneIndex = r.zoneIndex;
            }
            console.log('update card', card);
        });

    }, [gameState]);

    const onDrop = useCallback(async (data: SoloActionData) => {
        console.log('onDrop', data, gameState);
        if (!gameState) return;
        gameState.actionStatus = ActionStatus.DROPPING;
        const { dropTarget, card, cards } = data;
        if (!dropTarget || card?.zoneId === dropTarget.zoneId) {
            cancelDrag(data);
            return;
        }
        const zone = gameState.zones.find(z => z.id === dropTarget.zoneId);
        if (zone?.type === ZoneType.TABLEAU) {
            console.log('moveCard', data);
            moveCard(data);
            return;
        }
        if (zone?.type === ZoneType.FOUNDATION) {
            const suit = card?.zoneId.split('-')[1];
            if (card && card.suit !== suit) {
                const zoneId = `foundation-${card.suit}`;
                moveCard({ ...data, dropTarget: { ...dropTarget, zoneId } });
            } else
                moveCard(data);
            return;
        }
        if (zone?.type === ZoneType.WASTE) {
            wasteCard(data);
            return;
        }

    }, [gameState, boardDimension]);
    const onClickOrTouch = useCallback((data: SoloActionData) => {
        if (!gameState) return;
        const { card } = data;
        if (card?.zone === ZoneType.TABLEAU) {
            const zoneId = `foundation-${card.suit}`;
            const targetZone = gameState.zones.find(z => z.type === ZoneType.TABLEAU && z.id !== card.zoneId);
            if (targetZone) {
                moveCard({ card, cards: [], dropTarget: { zoneId } });
            }
            return;
        } else if (card?.zone === ZoneType.TALON) {
            drawCard({ card });
        }



    }, [gameState, boardDimension]);
    const cancelDrag = useCallback((data: SoloActionData) => {
        console.log('cancelDrag', data, gameState);
        PlayEffects.dragCancel({
            data: { cards: [data.card, ...(data.cards || [])], gameState, boardDimension }, onComplete: () => {
                if (gameState) {
                    gameState.actionStatus = ActionStatus.IDLE;
                }
            }
        });
    }, [gameState, boardDimension]);
    const drawCard = useCallback((data: SoloActionData) => {
        const { card } = data;
        if (!gameState || !card) return;
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste').sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        const wasteIndex = wasteCards.length === 0 ? 0 : wasteCards[wasteCards.length - 1].zoneIndex + 1;
        PlayEffects.hideCard({ data: { card } });
        setTimeout(() => {
            PlayEffects.popCard({ data: { card } });
        }, 400)
        const drawedCard: SoloCard = { ...card, isRevealed: true, zone: ZoneType.WASTE, zoneId: 'waste', zoneIndex: wasteIndex };
        PlayEffects.drawCard({
            data: { card: drawedCard, boardDimension, gameState }, onComplete: () => {
                onUpdate([drawedCard]);
                gameState.actionStatus = ActionStatus.IDLE;
            }
        });

    }, [gameState, boardDimension]);
    const wasteCard = useCallback((data: SoloActionData) => {
        console.log('wasteCard', data);
    }, []);

    const moveCard = useCallback(async (data: SoloActionData) => {
        const { card, cards, dropTarget } = data;
        if (!gameState || !card || !dropTarget) return;
        const flipCards: SoloCard[] = [];
        const dropCards: SoloCard[] = [];
        if (dropTarget.zoneId && card && dropTarget.zoneId !== card.zoneId) {
            const targetZone = gameState.zones.find((z: SoloZone) => z.id === dropTarget.zoneId);
            if (!targetZone) return;
            const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === dropTarget.zoneId).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
            const zoneIndex = zoneCards.length === 0 ? 0 : zoneCards[zoneCards.length - 1].zoneIndex + 1;
            dropCards.push({ ...card, zone: targetZone.type, zoneId: dropTarget.zoneId, zoneIndex: zoneIndex });
            cards?.sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex).forEach((c: SoloCard, index: number) => {
                dropCards.push({ ...c, zone: targetZone.type, zoneId: dropTarget.zoneId, zoneIndex: zoneIndex + index + 1 });
            });
        }
        // 任务1: 手动控制 resolve 的查询 Promise
        const queryPromise = new Promise<void>((resolve) => {
            const cards = gameState.cards.filter(c => c.zoneId === card.zoneId && c.zoneIndex < card.zoneIndex);

            setTimeout(() => {
                const flipCard = cards.length > 0 ? cards[cards.length - 1] : undefined;
                if (flipCard) {
                    flipCard.isRevealed = true;
                    flipCards.push({ ...flipCard, isRevealed: true })
                    PlayEffects.flipCard({
                        data: { card: flipCard, boardDimension }
                    });
                }
                resolve();
            }, 100);
            // convex.query(api.dao.userDao.findUser, { uid: '111' })
            //     .then((user) => {
            //         if (user) {
            //             console.log('User found:', user);
            //         }
            //         resolve(); // 成功时 resolve
            //     })
            //     .catch((error) => {
            //         console.error('Query user failed:', error);
            //         resolve(); // 失败时也 resolve，确保 Promise.all 继续执行
            //     });
        });

        // 任务2: 手动控制 resolve 的动画 Promise
        const animationPromise = new Promise<void>((resolve) => {
            PlayEffects.moveCard({
                data: { boardDimension, gameState, cards: dropCards },
                onComplete: resolve // 动画完成时 resolve
            });
        });

        // 等待两个操作都完成
        await Promise.all([queryPromise, animationPromise]);
        onUpdate([...flipCards, ...dropCards]);
        gameState.actionStatus = ActionStatus.IDLE;
        console.log("action finished", data);
        // data.status = 'finished';
        // 两个操作都完成后调用

    }, [gameState, boardDimension]);


    return { drawCard, onClickOrTouch, onDrop };
};

export default useActHandler;


