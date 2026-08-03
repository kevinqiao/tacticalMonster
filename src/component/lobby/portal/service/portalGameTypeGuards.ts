import {
  PARTNER_GAME_TYPES,
  type RegisteredPartnerGameType,
} from "@/convex/portal/convex/data/partnerGameRegistry";

export function isValidPortalGameType(value: string): value is RegisteredPartnerGameType {
  return (PARTNER_GAME_TYPES as readonly string[]).includes(value);
}
