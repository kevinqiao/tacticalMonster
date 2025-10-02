import { useCallback } from "react";
import { PlayEffects } from "../../animation/PlayEffects";
import { SoloCard } from "../../types/SoloTypes";
import { MatchEvent } from "../EventProvider";
import { useSoloGameManager } from "../GameManager";

const useGameHandler = () => {

    const { gameState, boardDimension } = useSoloGameManager();
    const handleEvent = useCallback((event: MatchEvent) => {
        // const { removeEvent } = useEventManager();
        console.log("handleEvent", event)
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
                PlayEffects.deal({ data: { cards: event.data.cards, boardDimension } });
                console.log("deal", event)
                break;
            case "init":

                PlayEffects.init({ data: { cards: gameState.cards, boardDimension } });

                break;
            default:
                console.log("gameDefault", event)
                break;
        }

    }, [gameState]);


    return { handleEvent };
};

export default useGameHandler;


