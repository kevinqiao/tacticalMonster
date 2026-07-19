import {
  crazyGamesGameplayStart,
  crazyGamesGameplayStop,
  crazyGamesLoadingStart,
  crazyGamesLoadingStop,
} from "../../platformAuth/embedSources/crazyGamesSdk";

export type PortalAdPhase =
  | "lobby"
  | "matchmaking"
  | "playing"
  | "settle"
  | "modal"
  | "hidden";

const PLAY_FLOW_PHASES: ReadonlySet<PortalAdPhase> = new Set([
  "playing",
  "settle",
  "matchmaking",
]);

let currentPhase: PortalAdPhase = "lobby";
const listeners = new Set<(phase: PortalAdPhase) => void>();

export function getPortalAdPhase(): PortalAdPhase {
  return currentPhase;
}

export function isPortalPlayFlowPhase(phase: PortalAdPhase): boolean {
  return PLAY_FLOW_PHASES.has(phase);
}

export function setPortalAdPhase(phase: PortalAdPhase): void {
  if (currentPhase === phase) return;
  const prev = currentPhase;
  currentPhase = phase;
  if (phase === "playing" && prev !== "playing") {
    crazyGamesGameplayStart();
  } else if (prev === "playing" && phase !== "playing") {
    crazyGamesGameplayStop();
  }
  for (const listener of listeners) {
    listener(phase);
  }
}

export function subscribePortalAdPhase(listener: (phase: PortalAdPhase) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function shouldShowSideBanners(phase: PortalAdPhase): boolean {
  return phase === "lobby" || phase === "settle" || phase === "modal" || phase === "matchmaking";
}

/** Play modal opened: track in-run load until assets are interactive. */
export function beginPortalGameSessionLoad(): void {
  crazyGamesLoadingStart();
}

/** Game interactive: end load metrics and enter gameplay (banners hide). */
export function markPortalGameplayReady(): void {
  crazyGamesLoadingStop();
  setPortalAdPhase("playing");
}

/** Leave play surface back to lobby chrome (play modal unmount). */
export function endPortalGameSession(): void {
  crazyGamesLoadingStop();
  const phase = getPortalAdPhase();
  if (phase === "playing" || phase === "matchmaking" || phase === "settle") {
    setPortalAdPhase("lobby");
  }
}
