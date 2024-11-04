import { useCallback, useEffect, useMemo } from "react";

import { playTurnAct } from "../animation/playTurnAct";
import { useCombatManager } from "./CombatManager";
import { CharacterUnit, CombatAction, CombatRound, CombatTurn, HexNode } from "./CombatModels";
interface Props {
    gridMap: HexNode[][] | null;
    characters?: CharacterUnit[];
    currentRound: CombatRound | null;
    currentTurn: CombatTurn | null;
    currentAction: CombatAction | null;
    setCurrentRound: React.Dispatch<React.SetStateAction<CombatRound | null>>;
    setCurrentTurn: React.Dispatch<React.SetStateAction<CombatTurn | null>>;
    setCurrentAction: React.Dispatch<React.SetStateAction<CombatAction | null>>;
}
const useActionHandler = () => {
    const combat = useCombatManager();
    const { players, currentAction, currentTurn, gridCells, cellSize, setCurrentAction } = combat;

    const characters = useMemo(() => {
        if (players)
            return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
    }, [players])

    const onStart = useCallback(() => {
        setCurrentAction((pre) => pre && pre.status === 0 ? { ...pre, status: 1 } : pre)
    }, [currentAction])

    const onPlay = useCallback(() => {

        if (!characters || !currentTurn || !currentAction || !gridCells) return;
        if (currentAction) {
            const character = characters.find((c) => c.id === currentTurn.character && c.uid === currentTurn.uid);
            if (character)
                playTurnAct({ ...combat, character });
        }
    }, [currentAction, currentTurn, gridCells, characters])

    const onComplete = useCallback(() => {
        console.log("on action complete")
    }, [combat])

    useEffect(() => {
        if (!currentAction) return;
        switch (currentAction.status) {
            case 0:
                onStart();
                break;
            case 1:
                onPlay();
                break;
            case 2:
                onComplete();
                break;
            default:
                break;
        }

    }, [currentAction]);
}
export default useActionHandler