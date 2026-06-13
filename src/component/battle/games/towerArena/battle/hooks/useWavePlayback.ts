import { useCallback, useState } from 'react';
import type { WaveSimFrame } from '@/convex/towerArena/convex/service/towerWaveSim';
import { simulateWaveWithFrames } from '@/convex/towerArena/convex/service/towerWaveSim';
import type { TowerArenaSeed } from '@/convex/towerArena/convex/types/TowerArenaSeed';
import type { PlacedTower } from '@/convex/towerArena/convex/types/TowerArenaTypes';

export function useWavePlayback() {
  const [frame, setFrame] = useState<WaveSimFrame | null>(null);
  const [playing, setPlaying] = useState(false);

  const playWave = useCallback(
    async (
      seed: TowerArenaSeed,
      waveIndex: number,
      towers: PlacedTower[],
      realDurationMs = 3200
    ) => {
      const { frames } = simulateWaveWithFrames(seed, waveIndex, towers);
      if (frames.length === 0) {
        setFrame(null);
        return;
      }

      setPlaying(true);
      const simStart = frames[0]!.simMs;
      const simEnd = frames[frames.length - 1]!.simMs;
      const simSpan = Math.max(1, simEnd - simStart);

      await new Promise<void>((resolve) => {
        const started = performance.now();
        const step = () => {
          const elapsed = performance.now() - started;
          const progress = Math.min(1, elapsed / realDurationMs);
          const targetSim = simStart + progress * simSpan;

          let idx = 0;
          while (idx + 1 < frames.length && frames[idx + 1]!.simMs <= targetSim) {
            idx++;
          }
          setFrame(frames[idx]!);

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      setPlaying(false);
      setFrame(null);
    },
    []
  );

  return { frame, playing, playWave };
}
