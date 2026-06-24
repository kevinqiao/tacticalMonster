/**
 * Portal run settlement — re-exports points-only effects.
 */
export {
  applyPortalTemplateScoreEffects,
  applyPortalTemplateScoreEffects as applyCasualTemplateScoreEffects,
  persistPendingRunRewards,
  prunePendingWalletRewards,
} from "./portalRunScoreEffects";
