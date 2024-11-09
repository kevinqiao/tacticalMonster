import { useEffect, useMemo } from "react";

import playCombatInit from "../animation/playCombatInit";
import { useCombatManager } from "./CombatManager";
import useActionHandler from "./useActionHandler";
import useEventHandler from "./useEventHandler";
import useTurnHandler from "./useTurnHandler";
import { CharacterUnit } from "./model/CombatModels";

const useCombatHandlers = () => {
    const combat = useCombatManager();
    const { resourceLoad, players, gridMap, gridCells } = combat;
    const characters = useMemo(() => {
        if (players)
            return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
    }, [players])
    const isResourceReady = resourceLoad ? Object.values(resourceLoad).every((value) => value === 1) : false

    useEffect(() => {
        if (!isResourceReady || !gridMap || !characters || !gridCells) return;
        playCombatInit({ gridMap, gridCells, characters });
    }, [characters, gridMap, gridCells, isResourceReady])
    useEventHandler();
    useActionHandler();
    useTurnHandler();
}
export default useCombatHandlers