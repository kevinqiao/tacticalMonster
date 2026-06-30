import type { EmbedAuthMethod } from "@/convex/sso/convex/service/embed/embedAuthConstants";
import type { Partner } from "../../PartnerManager";
import type { EmbedSdkSpec } from "./sdkLoader";

export type EmbedCredentialPayload = {
  credential: string;
  method: EmbedAuthMethod;
  pid: number;
  merchantSlug?: string;
};

export type EmbedSourceContext = {
  partnerPid: number;
  partner: Partner | null;
  partnerResolveReady: boolean;
  campaignMerchantSlug: string | null;
  portalPartnerKey: string | null;
  isFirstPartyPortal: boolean;
  search: string;
};

export interface EmbedCredentialSource {
  readonly id: string;
  readonly priority: number;
  readonly method: EmbedAuthMethod;
  sdkSpec?: EmbedSdkSpec;
  isActive(ctx: EmbedSourceContext): boolean;
  /** Subscribe for credentials (may be broader than isActive for embed gate). */
  shouldListen(ctx: EmbedSourceContext): boolean;
  shouldPreload?(ctx: EmbedSourceContext): boolean;
  start(ctx: EmbedSourceContext, onCredential: (payload: EmbedCredentialPayload) => void): () => void;
  refresh?(ctx: EmbedSourceContext): Promise<EmbedCredentialPayload | null>;
}
