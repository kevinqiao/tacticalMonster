import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useConvex } from 'convex/react';

import { api } from '@/convex/match3Arena/convex/_generated/api';
import { Match3GameEngine } from '@/convex/match3Arena/convex/service/Match3GameEngine';

import {
  gridAfterSwap,
  playMatch3TurnScript,
  turnScriptAfterSwap,
} from '../../animation/match3TurnPlayback';
import {
  MATCH3_GRID_COLS,
  MATCH3_GRID_ROWS,
  GameInteractionPhase,
  Match3GameStatus,
} from '../../types/Match3Types';
import { useMatch3GameManager } from '../GameManager';

function isPlayingStatus(status: unknown): boolean {
  return Number(status) === Match3GameStatus.PLAYING;
}

function waitPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function useActHandler(options?: { onSwapCommitted?: () => void }) {
  const convex = useConvex();
  const {
    gameState,
    gridCellRefs,
    boardMetricsRef,
    setInteractionPhase,
    commitGameState,
    completeCasualRun,
  } = useMatch3GameManager();

  const trySwap = useCallback(
    async (r1: number, c1: number, r2: number, c2: number): Promise<'ok' | 'invalid' | 'failed'> => {
      const restoreIdle = () => setInteractionPhase(GameInteractionPhase.idle);

      if (!gameState?.gameId) {
        restoreIdle();
        return 'failed';
      }
      if (!isPlayingStatus(gameState.status)) {
        restoreIdle();
        return 'failed';
      }
      if (!Match3GameEngine.isValidSwap(gameState.grid, r1, c1, r2, c2)) {
        return 'invalid';
      }

      const local = Match3GameEngine.applySwap(
        {
          grid: gameState.grid,
          score: gameState.score,
          moves: gameState.moves,
          seed: gameState.seed ?? gameState.gameId,
          refillCounter: gameState.refillCounter ?? MATCH3_GRID_ROWS * MATCH3_GRID_COLS,
        },
        r1,
        c1,
        r2,
        c2
      );
      if (!local.ok) {
        return 'invalid';
      }

      const refs = gridCellRefs.current;
      if (!refs) {
        restoreIdle();
        return 'failed';
      }

      setInteractionPhase(GameInteractionPhase.animating);
      options?.onSwapCommitted?.();

      const swappedGrid = gridAfterSwap(gameState.grid, r1, c1, r2, c2);
      commitGameState({ grid: swappedGrid });
      await waitPaint();

      const serverPromise = convex.mutation(api.service.gameManager.swap, {
        gameId: gameState.gameId,
        r1,
        c1,
        r2,
        c2,
      });

      try {
        await playMatch3TurnScript({
          turnScript: turnScriptAfterSwap(local.turnScript),
          finalGrid: local.grid,
          gridCellRefs: refs,
          initialWorkingGrid: swappedGrid,
          boardMetrics: boardMetricsRef.current,
          commitGrid: (grid) => {
            flushSync(() => commitGameState({ grid }));
          },
        });

        commitGameState({
          grid: local.grid,
          score: local.score,
          moves: local.moves,
          refillCounter: local.refillCounter,
        });
      } catch (e) {
        console.error('[match3] turn animation failed', e);
        commitGameState({
          grid: local.grid,
          score: local.score,
          moves: local.moves,
          refillCounter: local.refillCounter,
        });
      }

      try {
        const result = await serverPromise;
        if (!result?.ok) {
          console.warn('[match3] swap rejected', result);
          const fresh = await convex.query(api.service.gameManager.getGame, {
            gameId: gameState.gameId,
          });
          if (fresh) {
            commitGameState({
              grid: fresh.grid,
              score: fresh.score,
              moves: fresh.moves,
              status: fresh.status,
              refillCounter: fresh.refillCounter,
            });
          }
          return 'failed';
        }

        const fresh = await convex.query(api.service.gameManager.getGame, {
          gameId: gameState.gameId,
        });
        if (fresh) {
          commitGameState({
            grid: fresh.grid,
            score: fresh.score,
            moves: fresh.moves,
            status: fresh.status,
            refillCounter: fresh.refillCounter,
          });
        }

        if (fresh && !isPlayingStatus(fresh.status)) {
          await completeCasualRun();
        }
        return 'ok';
      } catch (e) {
        console.error('[match3] swap failed', e);
        try {
          const fresh = await convex.query(api.service.gameManager.getGame, {
            gameId: gameState.gameId,
          });
          if (fresh) {
            commitGameState({
              grid: fresh.grid,
              score: fresh.score,
              moves: fresh.moves,
              status: fresh.status,
              refillCounter: fresh.refillCounter,
            });
          }
        } catch {
          /* ignore reconcile error */
        }
        return 'failed';
      } finally {
        setInteractionPhase(GameInteractionPhase.idle);
      }
    },
    [convex, gameState, gridCellRefs, boardMetricsRef, setInteractionPhase, commitGameState, completeCasualRun, options?.onSwapCommitted]
  );

  return { trySwap };
}
