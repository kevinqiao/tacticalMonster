
import { useCombatManager } from "./CombatManager";
import useEventHandler from "./useEventHandler";

const useCombatHandlers = () => {
    const combat = useCombatManager();
    const { resourceLoad, gridCells } = combat;

    const isResourceReady = resourceLoad ? Object.values(resourceLoad).every((value) => value === 1) : false

    // useEffect(() => {
    //     if (!isResourceReady || !gridMap || !characters || !gridCells) return;
    //     playCombatInit({ gridMap, gridCells, characters });
    // }, [characters, gridMap, gridCells, isResourceReady])
    useEventHandler();
    // useActionHandler();
    // useTurnHandler();
}
export default useCombatHandlers