#!/usr/bin/env node
/**
 * Live SSO integration: partner JWT → exchangeEmbedCredential → platform session.
 *
 * Prerequisites: `npx convex dev` running in src/convex/sso
 *
 * Usage:
 *   node scripts/embed-auth-integration.mjs
 *   node scripts/embed-auth-integration.mjs --bootstrap
 *   node scripts/embed-auth-integration.mjs --bootstrap --pid=0 --sub=demo_user
 *
 * Env (optional):
 *   PARTNER_EMBED_BOOTSTRAP_SECRET
 */
import jwt from "jsonwebtoken";

import { runConvexSso } from "./platform/run-convex-sso.mjs";

const EMBED_JWT_AUDIENCE = "tacticalmonster-embed";
const DEV_BOOTSTRAP_SECRET = "dev-local-partner-embed-bootstrap";

function parseArgs(argv) {
  const get = (name) => {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };

  const pidRaw = get("--pid");
  return {
    bootstrap: argv.includes("--bootstrap"),
    pid: pidRaw != null ? Number(pidRaw) : 0,
    sub: get("--sub") ?? "embed_integration_user",
    email: get("--email") ?? "embed-integration@test.local",
    jwtSecret: get("--secret"),
    merchantSlug: get("--partner-slug") ?? get("--merchant-slug") ?? "demo-partner",
    campaignSlug: get("--campaign-slug") ?? "play-test",
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod"),
  };
}

function partnerJwtSecret(pid, secret) {
  return secret ?? `partner-dev-secret-${pid}`;
}

function mintPartnerJwt({ pid, sub, email, secret }) {
  return jwt.sign({ sub, email }, secret, {
    algorithm: "HS256",
    audience: EMBED_JWT_AUDIENCE,
    expiresIn: "15m",
  });
}

function assertSession(session) {
  if (!session || typeof session !== "object") {
    throw new Error("exchangeEmbedCredential returned empty session");
  }
  if (!session.uid || typeof session.uid !== "string") {
    throw new Error(`missing uid in session: ${JSON.stringify(session)}`);
  }
  if (!session.platformAccessToken || typeof session.platformAccessToken !== "string") {
    throw new Error(`missing platformAccessToken in session: ${JSON.stringify(session)}`);
  }
  const parts = session.platformAccessToken.split(".");
  if (parts.length !== 3) {
    throw new Error("platformAccessToken is not a JWT");
  }
}

function printBrowserHandoff({ token, partnerSlug, campaignSlug }) {
  const landing = `/cc/${partnerSlug}/${campaignSlug}`;
  console.log("\n=== Browser handoff (paste in devtools before/at load) ===\n");
  console.log(`window.__PARTNER_AUTH__ = { token: ${JSON.stringify(token)} };`);
  console.log("\nLanding URL:");
  console.log(`  http://localhost:3000${landing}`);
  console.log("\nOr postMessage after load:");
  console.log(
    `window.postMessage(${JSON.stringify({ type: "PARTNER_AUTH", token })}, "*");`
  );
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  console.log("== Embed auth integration (live SSO) ==");
  console.log("  pid:", config.pid);
  console.log("  sub:", config.sub);
  console.log("  bootstrap:", config.bootstrap);

  let jwtSecret = partnerJwtSecret(config.pid, config.jwtSecret);

  if (config.bootstrap) {
    console.log("\n[1/3] Bootstrapping partner embed config...");
    const boot = runConvexSso(
      "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
      {
        bootstrapSecret: config.bootstrapSecret,
        pid: config.pid,
        allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
        ...(config.jwtSecret ? { jwtSecret: config.jwtSecret } : {}),
      },
      config.convexArgs
    );
    console.log("  bootstrap:", boot);
    if (boot?.jwtSecret) jwtSecret = boot.jwtSecret;
  } else {
    console.log("\n[1/3] Skipping bootstrap (virtual partner fallback still works for pid=0)");
  }

  const credential = mintPartnerJwt({
    pid: config.pid,
    sub: config.sub,
    email: config.email,
    secret: jwtSecret,
  });
  console.log("\n[2/3] Minted partner JWT (HS256, aud=tacticalmonster-embed)");
  console.log("  credential length:", credential.length);

  console.log("\n[3/3] Calling exchangeEmbedCredential...");
  const session = runConvexSso(
    "service/auth/platformAuth:exchangeEmbedCredential",
    {
      pid: config.pid,
      credential,
      method: "jwt_local",
      merchantSlug: config.merchantSlug,
    },
    config.convexArgs
  );

  assertSession(session);
  console.log("\n✓ Integration passed");
  console.log("  uid:", session.uid);
  console.log("  partner:", session.partner);
  console.log("  email:", session.email);
  console.log("  platformAccessToken:", `${session.platformAccessToken.slice(0, 32)}...`);

  printBrowserHandoff({
    token: credential,
    partnerSlug: config.merchantSlug,
    campaignSlug: config.campaignSlug,
  });
}

try {
  main();
} catch (error) {
  console.error("\n✗ Integration failed:", error instanceof Error ? error.message : error);
  console.error("\nHint: ensure SSO convex dev is running (cd src/convex/sso && npx convex dev)");
  process.exit(1);
}
