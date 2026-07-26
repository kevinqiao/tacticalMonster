import type { EmbedAuthMethod } from "@/convex/sso/convex/service/embed/embedAuthConstants";
import type { Partner } from "../../PartnerManager";
import type { EmbedSdkSpec } from "./sdkLoader";

export type EmbedCredentialPayload = {
  credential: string;
  method: EmbedAuthMethod;
  pid: number;
  partnerSlug?: string;
};

export type EmbedSourceContext = {
  partnerPid: number;
  partner: Partner | null;
  partnerResolveReady: boolean;
  campaignPartnerSlug: string | null;
  portalPartnerSlug: string | null;
  isFirstPartyPortal: boolean;
  search: string;
};

export interface EmbedCredentialSource {
  readonly id: string;
  readonly priority: number;
  /** Auth method sent on credential exchange (1:1 with this source implementation). */
  readonly method: EmbedAuthMethod;
  sdkSpec?: EmbedSdkSpec;
  isActive(ctx: EmbedSourceContext): boolean;
  /** Subscribe for credentials (may be broader than isActive for embed gate). */
  shouldListen(ctx: EmbedSourceContext): boolean;
  shouldPreload?(ctx: EmbedSourceContext): boolean;
  /**
   * Host-SDK sources: true when this source owns the page for the current ctx
   * (typically `shouldPreload || isActive`). When any source claims, Bridge only
   * starts claiming sources — generic postMessage must not enumerate brands.
   */
  claimsHost?(ctx: EmbedSourceContext): boolean;
  start(ctx: EmbedSourceContext, onCredential: (payload: EmbedCredentialPayload) => void): () => void;
  refresh?(ctx: EmbedSourceContext): Promise<EmbedCredentialPayload | null>;
}
