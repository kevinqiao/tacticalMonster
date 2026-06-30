export type CasualPlatformBridge = "portal" | "casual";

/** Args for arena `submitCasualPlatformRun` / `forceEndCasualPlatformRun` / `replayCasualRun`. Auth via Convex setAuth. */
export function buildCasualPlatformRunActionArgs(args: {
  gameId: string;
  platformBridge?: CasualPlatformBridge;
}) {
  return {
    gameId: args.gameId,
    ...(args.platformBridge ? { platformBridge: args.platformBridge } : {}),
  };
}
