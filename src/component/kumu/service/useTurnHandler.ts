import { useCallback, useEffect, useMemo } from "react";

import playTurnSet from "../animation/playTurnSet";
import { useCombatManager } from "./CombatManager";
import { CharacterUnit } from "./CombatModels";

const useTurnHandler = () => {
    const combat = useCombatManager();
    const { currentTurn, resourceLoad, players, gridMap, gridCells, setCurrentTurn } = combat;
    const characters = useMemo(() => {
        if (players)
            return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
    }, [players])
    const isResourceReady = resourceLoad ? Object.values(resourceLoad).every((value) => value === 1) : false
    const onStart = useCallback(() => {
        setCurrentTurn((pre) => pre && pre.status === 0 ? { ...pre, status: 1 } : pre)
        console.log("on Turn start");
    }, [])
    const onPlay = useCallback(async () => {
        console.log("turn set")
        if (!isResourceReady || !currentTurn || !characters || !gridCells) return;
        playTurnSet({ currentTurn, characters, gridCells });
    }, [isResourceReady, currentTurn, characters, gridCells])
    const onComplete = useCallback(() => {
        console.log("on Turn complete")
    }, [combat])
    useEffect(() => {
        if (!currentTurn) return;
        switch (currentTurn.status) {
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

    }, [currentTurn]);
}
export default useTurnHandler