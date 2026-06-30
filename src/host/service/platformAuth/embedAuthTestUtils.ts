import jwt from "jsonwebtoken";

import { EMBED_JWT_AUDIENCE } from "@/convex/sso/convex/service/embed/embedAuthConstants";
import { partnerJwtSecret } from "@/convex/sso/convex/service/embed/partnerEmbedConfig";

import type { PartnerAuthMessage } from "./partnerEmbedAuth";

export type MintDevPartnerEmbedJwtArgs = {
  pid: number;
  sub: string;
  email?: string;
  jwtSecret?: string;
  expiresIn?: string | number;
};

/** Mint HS256 partner embed JWT (dev/tests — matches JwtLocalEmbedAuthProvider). */
export function mintDevPartnerEmbedJwt(args: MintDevPartnerEmbedJwtArgs): string {
  const partnerData = args.jwtSecret ? { jwtSecret: args.jwtSecret } : {};
  const secret = args.jwtSecret ?? partnerJwtSecret(args.pid, partnerData);
  return jwt.sign(
    {
      sub: args.sub,
      ...(args.email ? { email: args.email } : {}),
    },
    secret,
    {
      algorithm: "HS256",
      audience: EMBED_JWT_AUDIENCE,
      expiresIn: args.expiresIn ?? "15m",
    }
  );
}

export function partnerAuthMessage(
  token: string,
  pid = 0
): PartnerAuthMessage {
  return { type: "PARTNER_AUTH", token, pid };
}

/** Simulate native WebView postMessage into the page. */
export function postPartnerEmbedAuthMessage(
  token: string,
  pid = 0,
  origin: string = typeof window !== "undefined" ? window.location.origin : "http://localhost"
): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: partnerAuthMessage(token, pid),
      origin,
    })
  );
}

/** Simulate load-time injection before React mounts. */
export function injectPartnerEmbedAuthGlobals(token: string, pid = 0): void {
  window.__PARTNER_AUTH__ = { token, pid };
}

export function clearPartnerEmbedAuthGlobals(): void {
  delete window.__PARTNER_AUTH__;
}

/** Dev console helper: inject + dispatch message (mirrors APP bootstrap). */
export function simulateAppEmbedAuthHandoff(token: string, pid = 0): void {
  injectPartnerEmbedAuthGlobals(token, pid);
  postPartnerEmbedAuthMessage(token, pid);
}
