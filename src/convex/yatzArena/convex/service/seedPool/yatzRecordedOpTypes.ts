import type { YatzCategory } from "../../types/YatzTypes";
import { YATZ_MANIFEST_POLICY_VERSION } from "../yatzSeedManifest";

export { YATZ_MANIFEST_POLICY_VERSION };

export type YatzRecordedStep =
  | { op: "roll"; pacingMs?: number }
  | { op: "toggle_hold"; index: number; pacingMs?: number }
  | { op: "pick_category"; category: YatzCategory; pacingMs?: number }
  | { op: "concede"; pacingMs?: number };

export type YatzRolloutScript = {
  rolloutIndex: number;
  policyVersion: typeof YATZ_MANIFEST_POLICY_VERSION;
  ops: YatzRecordedStep[];
  replayPacingMs?: number[];
  finalScore: number;
  completed: boolean;
};

export function formatYatzSeedId(poolVersion: string, index: number): string {
  return `${poolVersion}_yatz_${String(index).padStart(5, "0")}`;
}
