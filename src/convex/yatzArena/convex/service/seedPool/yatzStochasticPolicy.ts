/**
 * Per-rollout policy RNG for Yatz bots.
 * Dice/manifest stay on seedId; only decisions sample this stream.
 */
import { createSeededRandom } from "../../utils/seedRandom";
import { personaForRollout, type YatzPersona } from "./yatzHumanPersonas";

export type YatzPolicyContext = {
  rng: () => number;
  rolloutIndex: number;
  persona: YatzPersona;
};

/** Same naming as Solitaire: `${seedId}|rollout|${rolloutIndex}`. */
export function createYatzPolicyContext(
  seedId: string,
  rolloutIndex: number
): YatzPolicyContext {
  return {
    rng: createSeededRandom(`${seedId}|rollout|${rolloutIndex}`),
    rolloutIndex,
    persona: personaForRollout(rolloutIndex),
  };
}
