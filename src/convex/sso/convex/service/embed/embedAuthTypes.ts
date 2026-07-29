import type { EmbedAuthMethod } from "./embedAuthConstants";

export type EmbedIdentity = {
  subject: string;
  email?: string;
};

/** Partner row shape needed by embed providers (SSO partner table). */
export type PartnerEmbedContext = {
  pid: number;
  name?: string;
  host?: string;
  embed?: unknown;
  data?: unknown;
};

export type EmbedVerifyArgs = {
  pid: number;
  credential: string;
  partner: PartnerEmbedContext;
};

export interface EmbedAuthProvider {
  readonly method: EmbedAuthMethod;
  supports(partner: PartnerEmbedContext): boolean;
  verify(args: EmbedVerifyArgs): Promise<EmbedIdentity | null>;
}
