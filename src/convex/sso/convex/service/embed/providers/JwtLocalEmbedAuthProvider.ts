"use node";

import jwt from "jsonwebtoken";

import type { EmbedAuthProvider, EmbedIdentity, EmbedVerifyArgs } from "../embedAuthTypes";
import { embedJwtAudience, partnerJwtSecret } from "../partnerEmbedConfig";

function verifyPartnerJwtLocally(args: EmbedVerifyArgs): EmbedIdentity | null {
  const { pid, credential, partner } = args;
  const secret = partnerJwtSecret(pid, partner.data);
  const audience = embedJwtAudience(partner.data);

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(credential, secret, {
      algorithms: ["HS256"],
      audience,
    }) as jwt.JwtPayload;
  } catch {
    return null;
  }

  const subject = typeof payload.sub === "string" ? payload.sub.trim() : "";
  if (!subject) return null;

  return {
    subject,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export const jwtLocalEmbedAuthProvider: EmbedAuthProvider = {
  method: "jwt_local",

  supports(_partner) {
    return true;
  },

  async verify(args) {
    return verifyPartnerJwtLocally(args);
  },
};
