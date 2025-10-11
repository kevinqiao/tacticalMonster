import { useCallback } from "react";
import { PlayEffects } from "../../animation/PlayEffects";
import { SoloCard } from "../../types/SoloTypes";
import { MatchEvent } from "../EventProvider";
import { useSoloGameManager } from "../GameManager";

const useEventHandler = () => {

    const { gameState, boardDimension } = useSoloGameManager();

    const handleEvent = useCallback((event: MatchEvent, onComplete?: (eventId: string) => void) => {
        // const { removeEvent } = useEventManager();       
        if (!gameState) return;
        const { id, name, data } = event;
        event.status = 1;
        switch (name) {
            case "shuffle":
                console.log("shuffle", event)
                PlayEffects.shuffle({ data: { cards: gameState?.cards, boardDimension } });
                break;
            case "deal":
                const { cards } = data;
                cards.forEach((c: SoloCard) => {
                    const gcard = gameState.cards.find(cc => cc.id === c.id);
                    if (gcard) {
                        Object.assign(gcard, c);
                    }
                });
                PlayEffects.deal({ data: { cards: event.data.cards, gameState, boardDimension }, onComplete: () => onComplete?.(event.id) });
                console.log("deal", event)
                break;
            case "init":
                PlayEffects.init({ data: { cards: gameState.cards, boardDimension } });
                break;
            case "dragCancel":
                PlayEffects.dragCancel({ data: { cards: gameState.cards, gameState, boardDimension } });
                break;
            case "drop":
                const dropCards = event.data.dropCards;
                dropCards.forEach((c: SoloCard) => {
                    const gcard = gameState.cards.find(cc => cc.id === c.id);
                    if (gcard) {
                        Object.assign(gcard, c);
                    }
                });
                PlayEffects.drop({ data: { ...event.data, gameState, boardDimension }, onComplete: () => onComplete?.(event.id) });
                break;
            default:
                console.log("gameDefault", event)
                break;
        }

    }, [gameState, boardDimension]);


    return { handleEvent };
};

export default useEventHandler;


