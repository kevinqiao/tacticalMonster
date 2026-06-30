"use node";

import type { ActionCtx } from "../../_generated/server";

import type { User } from "../../../../host/service/UserManager";
import type { EmbedAuthMethod } from "../embed/embedAuthConstants";
import { performEmbedCredentialExchange } from "../embed/embedAuthOrchestrator";
import { Authenticator } from "./AuthenticatorFactory";

export class EmbedAuthenticator implements Authenticator {
  private channel: { cid: number; provider: string };

  constructor(channel: { cid: number; provider: string }) {
    this.channel = channel;
  }

  async signIn(
    ctx: ActionCtx,
    partner: number | undefined,
    data: {
      credential?: string;
      method?: EmbedAuthMethod;
      merchantSlug?: string;
    }
  ): Promise<User | null> {
    const pid = partner;
    const credential = typeof data?.credential === "string" ? data.credential : "";
    if (pid == null || !credential) return null;

    return performEmbedCredentialExchange(ctx, {
      pid,
      credential,
      method: data?.method,
      merchantSlug: data?.merchantSlug,
    });
  }
}
