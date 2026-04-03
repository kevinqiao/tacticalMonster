import { useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useState } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { getAllMonsterGlbPaths } from "../utils/modelPathMapper";

export function useBattleVenueModelLoading() {
    const { mapDimension, game } = useCombatManager();
    useEffect(() => {
        getAllMonsterGlbPaths().forEach((path) => useGLTF.preload(path));
    }, []);

    const [loadedModelCount, setLoadedModelCount] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setLoadedModelCount(0);
        if (!mapDimension) return;
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count === 0) setIsLoaded(true);
        else setIsLoaded(false);
    }, [mapDimension, game?.gameId]);

    useEffect(() => {
        const count =
            (game?.team?.length ?? 0) + (game?.boss ? 1 + (game.boss.minions?.length ?? 0) : 0);
        if (count > 0 && loadedModelCount >= count) setIsLoaded(true);
    }, [loadedModelCount, game?.team, game?.boss]);

    const onModelLoaded = useCallback((_monsterId: string) => {
        setLoadedModelCount((c) => c + 1);
    }, []);

    const handleProgress = useCallback((progress: number) => {
        setLoadingProgress(progress);
    }, []);

    return { loadedModelCount, loadingProgress, isLoaded, onModelLoaded, handleProgress };
}
