import { useConvex } from 'convex/react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useUserManager } from 'host/service/UserManager';
import { api } from '@/convex/towerArena/convex/_generated/api';
import { generateTowerSeedFromId } from '@/convex/towerArena/convex/shared/towerSeedCatalog';

export type TowerGameView = {
  gameId: string;
  seedId: string;
  phase: string;
  status: number;
  lives: number;
  gold: number;
  currentWave: number;
  wavesCleared: number;
  towers: Array<{ slotId: string; towerId: string; level: number }>;
  unlockedTowerIds: string[];
  score: number;
  seed?: ReturnType<typeof generateTowerSeedFromId>;
};

type Ctx = {
  game: TowerGameView | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  reloadCasualRun: () => Promise<boolean>;
  replayCasualRun: () => Promise<boolean>;
  casualTournamentId?: string;
  onGameSubmit?: () => void;
};

const TowerGameContext = createContext<Ctx>({
  game: null,
  loading: true,
  error: null,
  reload: async () => {},
  reloadCasualRun: async () => false,
  replayCasualRun: async () => false,
});

export function useTowerGame() {
  return useContext(TowerGameContext);
}

const TowerGameProvider: React.FC<{
  gameId: string;
  casualTournamentId?: string;
  onGameSubmit?: () => void;
  children: React.ReactNode;
}> = ({ gameId, casualTournamentId, onGameSubmit, children }) => {
  const convex = useConvex();
  const { user } = useUserManager();
  const [game, setGame] = useState<TowerGameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyLoadedGame = useCallback(
    (g: Record<string, unknown>) => {
      const seedId = String(g.seedId ?? '');
      setGame({
        gameId,
        seedId,
        phase: String(g.phase ?? 'build'),
        status: Number(g.status ?? 0),
        lives: Number(g.lives ?? 0),
        gold: Number(g.gold ?? 0),
        currentWave: Number(g.currentWave ?? 0),
        wavesCleared: Number(g.wavesCleared ?? 0),
        towers: (g.towers as TowerGameView['towers']) ?? [],
        unlockedTowerIds: (g.unlockedTowerIds as string[]) ?? [],
        score: Number(g.score ?? 0),
        seed: seedId ? generateTowerSeedFromId(seedId) : undefined,
      });
    },
    [gameId]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await convex.action(api.proxy.controller.loadGame, { gameId })) as {
        ok?: boolean;
        game?: Record<string, unknown>;
        error?: string;
      };
      if (!res?.ok || !res.game) {
        setError(res?.error ?? 'load_failed');
        setGame(null);
        return;
      }
      applyLoadedGame(res.game);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [convex, gameId, applyLoadedGame]);

  const reloadCasualRun = useCallback(async (): Promise<boolean> => {
    if (!gameId.startsWith('game_')) return false;
    try {
      const res = (await convex.action(api.proxy.controller.loadGame, {
        gameId,
        resetCasualRun: true,
      })) as { ok?: boolean; game?: Record<string, unknown>; error?: string };
      if (!res?.ok || !res.game) {
        console.warn('[Tower] reloadCasualRun', res?.error);
        return false;
      }
      applyLoadedGame(res.game);
      return true;
    } catch (e) {
      console.error('[Tower] reloadCasualRun', e);
      return false;
    }
  }, [convex, gameId, applyLoadedGame]);

  const replayCasualRun = useCallback(async (): Promise<boolean> => {
    if (!gameId.startsWith('game_') || !user?.token) return false;
    try {
      const rr = (await convex.action(api.proxy.controller.replayCasualRun, {
        token: user.token,
        gameId,
      })) as { ok?: boolean; error?: string };
      if (!rr?.ok) {
        console.warn('[Tower] replayCasualRun', rr?.error);
        return false;
      }
      return reloadCasualRun();
    } catch (e) {
      console.error('[Tower] replayCasualRun', e);
      return false;
    }
  }, [convex, gameId, user?.token, reloadCasualRun]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      game,
      loading,
      error,
      reload,
      reloadCasualRun,
      replayCasualRun,
      casualTournamentId,
      onGameSubmit,
    }),
    [game, loading, error, reload, reloadCasualRun, replayCasualRun, casualTournamentId, onGameSubmit]
  );

  return <TowerGameContext.Provider value={value}>{children}</TowerGameContext.Provider>;
};

export default TowerGameProvider;
