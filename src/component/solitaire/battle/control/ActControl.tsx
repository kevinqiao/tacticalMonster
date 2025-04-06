import React, { useCallback, useMemo } from 'react';
import { useSSAManager } from 'service/SSAManager';
import useActionAnimate from '../animation/useActionAnimate';
import useTurnAnimate from '../animation/useTurnAnimate';
import { useCombatManager } from '../service/CombatManager';
import DnDProvider from '../service/DnDProvider';
import useCombatAct from '../service/useCombatAct';
import { Card } from '../types/CombatTypes';
import DnDCard from '../view/DnDCard';
// 抽象事件类型
type DragEventType = 'start' | 'move' | 'end' | 'over' | 'drop';
export type DragEventData = {
    x: number;
    y: number;
    id: string;
};


const ActControl: React.FC = () => {
    const { player } = useSSAManager();
    const { eventQueue, game, boardDimension, direction, currentAct, completeAct } = useCombatManager();
    const { playMove, playOpenCard } = useActionAnimate();
    const { playTurnActed } = useTurnAnimate();
    const { move } = useCombatAct();

    const draggables = useMemo(() => {

        if (!game || !game.currentTurn || !currentAct || !player || !player.uid) {
            return
        }
        if (!game.currentTurn || game.currentTurn.uid !== player.uid) {
            // console.log("currentAct.uid !== user.uid", currentAct, user);
            return;
        }
        const currentSeat = game.seats?.find(s => s.uid === game.currentTurn?.uid);
        if (!currentSeat) return;

        const cards = game.cards?.filter((c: Card) => c.field === currentSeat.field && c.status === 1);
        return cards;

    }, [game, currentAct, player])

    const onDrop = useCallback(async (draggingCards: Card[], targets: string[]) => {
        if (!game || !boardDimension || !draggingCards.length) return;
        if (targets.length === 0) {
            playMove({ data: { move: draggingCards } });
            return;
        }
        const [zone, slot] = targets[0].split("_");

        const field = Number(zone) < 2 ? +zone : (direction === 1 ? (zone === "2" ? 3 : 2) : +zone);
        if (draggingCards[0].field === field && draggingCards[0].col === Number(slot)) {
            playMove({ data: { move: draggingCards } });
            return;
        }
        completeAct();
        await executeDrop(draggingCards, { field, slot: Number(slot) });


    }, [game, boardDimension, direction, playMove])
    const executeDrop = useCallback(async (draggingCards: Card[], target: { field: number, slot: number }) => {
        if (!game || !boardDimension) return;
        const onComplete = () => {

            setTimeout(() => playTurnActed({
                data: {
                    uid: game?.currentTurn?.uid,
                    acted: game?.currentTurn?.actions.acted.length
                }, onComplete: () => {
                    // completeAct();
                    const index = eventQueue.findIndex(e => e.name === "localAct");
                    if (index !== -1) {
                        eventQueue.splice(index, 1);
                    }
                }
            }), 500);
        }
        const cards = game.cards?.filter((c: Card) => c.field === target.field && c.col === target.slot);
        const row = cards?.length || 0;
        const col = Number(target.slot);
        const prePos: Card[] = [];

        draggingCards.forEach((c: Card, index: number) => {
            prePos.push({ ...c });
            c.row = row + index;
            c.field = target.field;
            c.col = col;
        });
        const localEvent = { name: "localAct", data: { cardId: draggingCards[0].id, to: target } };
        eventQueue.push(localEvent);
        playMove({ data: { move: draggingCards } });
        const res = await move(draggingCards[0].id, target);

        if (res.ok && res.result.open && res.result.open.length > 0) {
            const openCards: Card[] = [];
            res.result.open.forEach((card: Card) => {
                const mcard = game.cards?.find((c) => c.id === card.id);
                if (mcard) {
                    mcard.suit = card.suit;
                    mcard.rank = card.rank;
                    mcard.status = 1;
                    openCards.push(mcard);
                }
            });
            playOpenCard({ cards: openCards, onComplete: onComplete });
            //trigger skill
            // const triggerCard = openCards[0].rank;
            // triggerSkill(triggerCard);
        } else {
            onComplete();
        }


    }, [game, boardDimension, direction, playMove, playOpenCard])
    return (
        <DnDProvider onDrop={onDrop}>
            {draggables?.map((card: Card) => <DnDCard key={card.id} card={card} />)}
        </DnDProvider>
    );
};


export default ActControl;


