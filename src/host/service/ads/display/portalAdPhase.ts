export type PortalAdPhase =
  | "lobby"
  | "matchmaking"
  | "playing"
  | "settle"
  | "modal"
  | "hidden";

let currentPhase: PortalAdPhase = "lobby";
const listeners = new Set<(phase: PortalAdPhase) => void>();

export function getPortalAdPhase(): PortalAdPhase {
  return currentPhase;
}

export function setPortalAdPhase(phase: PortalAdPhase): void {
  if (currentPhase === phase) return;
  currentPhase = phase;
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
