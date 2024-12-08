import { useEffect } from "react";

import { playInitPlaza } from "../animation/playCombatInit";
import { useCombatManager } from "./CombatManager";

const useGameInit = () => {
    const { gridCells, resourceLoad } = useCombatManager();
    const groundReady = resourceLoad ? resourceLoad["gridContainer"] === 1 && resourceLoad["gridGround"] === 1 : false;
    useEffect(() => {

        if (gridCells && groundReady) {
            console.log("game init")
            playInitPlaza(gridCells)
        }
    }, [groundReady, gridCells]);
}
export default useGameInit