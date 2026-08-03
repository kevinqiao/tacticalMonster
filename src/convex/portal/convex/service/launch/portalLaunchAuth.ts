import { portalGameBridgeSecret } from "../bridge/casualGameBridgeSecret";

/** Agent/MCP bridge auth for portal launch tools (reuses portal bridge secret). */
export function assertPortalLaunchBridgeSecret(secret: string | undefined): void {
  const expected = portalGameBridgeSecret();
  if (typeof secret !== "string" || secret.trim().length === 0 || secret.trim() !== expected) {
    throw new Error("unauthorized");
  }
}
