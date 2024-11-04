import { useCallback, useEffect } from "react";

import { useCombatManager } from "./CombatManager";

const useRoundHandler = () => {
    const combat = useCombatManager();
    const { currentRound } = combat;

    const onStart = useCallback(() => {
        console.log("on round start");
    }, [combat])


    const onComplete = useCallback(() => {
        console.log("on round complete")
    }, [combat])
    useEffect(() => {
        if (!currentRound) return;
        switch (currentRound.status) {
            case 0:
                onStart();
                break;
            case 1:
                onComplete();
                break;
            default:
                break;
        }

    }, [currentRound]);
}
export default useRoundHandler