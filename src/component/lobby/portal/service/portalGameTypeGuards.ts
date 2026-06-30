import {
  PORTAL_GAME_TYPES,
  type RegisteredPortalGameType,
} from "@/convex/portal/convex/data/portalGameRegistry";

export function isValidPortalGameType(value: string): value is RegisteredPortalGameType {
  return (PORTAL_GAME_TYPES as readonly string[]).includes(value);
}
