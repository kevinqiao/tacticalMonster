import { useConvex } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '@/convex/towerArena/convex/_generated/api';
import { useUserManager } from 'host/service/UserManager';
import { useTowerGame } from '../GameManager';

type OpResult = { ok?: boolean; error?: string } | undefined;

export function useTowerActHandler() {
  const convex = useConvex();
  const { game, reload, casualTournamentId, onGameSubmit } = useTowerGame();
  const { user } = useUserManager();
  const [busy, setBusy] = useState(false);

  const runOp = useCallback(
    async (fn: () => Promise<unknown>): Promise<OpResult> => {
      if (!game || busy) return { ok: false, error: 'busy' };
      setBusy(true);
      try {
        const res = (await fn()) as OpResult;
        await reload();
        return res;
      } finally {
        setBusy(false);
      }
    },
    [game, busy, reload]
  );

  const place = (slotId: string, towerId: string) =>
    runOp(() =>
      convex.mutation(api.service.gameManager.placeTower, {
        gameId: game!.gameId,
        slotId,
        towerId,
      })
    );

  const upgrade = (slotId: string) =>
    runOp(() =>
      convex.mutation(api.service.gameManager.upgradeTower, {
        gameId: game!.gameId,
        slotId,
      })
    );

  const sell = (slotId: string) =>
    runOp(() =>
      convex.mutation(api.service.gameManager.sellTower, {
        gameId: game!.gameId,
        slotId,
      })
    );

  const startWaveAnimated = useCallback(
    async (playAnimation: () => Promise<void>) => {
      if (!game || busy) return undefined;
      setBusy(true);
      try {
        await playAnimation();
        const res = (await convex.mutation(api.service.gameManager.startWave, {
          gameId: game.gameId,
        })) as OpResult & {
          lives?: number;
          wavesCleared?: number;
          gold?: number;
        };
        await reload();
        return res;
      } finally {
        setBusy(false);
      }
    },
    [game, busy, convex, reload]
  );

  const concedeAndSubmit = useCallback(async () => {
    if (!game || !user?.token) return;
    setBusy(true);
    try {
      await convex.mutation(api.service.gameManager.concedeGame, { gameId: game.gameId });
      if (game.gameId.startsWith('game_') && casualTournamentId) {
        await convex.action(api.proxy.controller.submitCasualPlatformRun, {
          token: user.token,
          gameId: game.gameId,
        });
      }
      onGameSubmit?.();
    } finally {
      setBusy(false);
    }
  }, [game, user?.token, convex, casualTournamentId, onGameSubmit]);

  return { place, upgrade, sell, startWaveAnimated, concedeAndSubmit, busy };
};
