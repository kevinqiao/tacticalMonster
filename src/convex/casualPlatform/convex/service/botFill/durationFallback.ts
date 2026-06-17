import {
  CASUAL_BOT_DURATION_FALLBACK_MAX_MS,
  CASUAL_BOT_DURATION_FALLBACK_MIN_MS,
} from "../../shared/constants";
import { pseudoUnit } from "../../shared/pseudoUnit";

export function pickDurationFallbackMs(sessionSeed: number, slotIndex: number): number {
  const min = CASUAL_BOT_DURATION_FALLBACK_MIN_MS;
  const max = CASUAL_BOT_DURATION_FALLBACK_MAX_MS;
  const span = max - min + 1;
  return min + Math.floor(pseudoUnit(sessionSeed, slotIndex + 61) * span);
}
