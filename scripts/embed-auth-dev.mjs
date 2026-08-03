#!/usr/bin/env node
/**
 * Mint a dev partner embed JWT and print WebView handoff snippets.
 *
 * Usage:
 *   node scripts/embed-auth-dev.mjs
 *   node scripts/embed-auth-dev.mjs --pid=0 --sub=demo_user --email=demo@test.com
 */
import jwt from "jsonwebtoken";

const EMBED_JWT_AUDIENCE = "tacticalmonster-embed";

function parseArgs(argv) {
  const out = { pid: 0, sub: "partner_user_demo", email: "demo@partner.test", secret: undefined };
  for (const arg of argv) {
    if (arg.startsWith("--pid=")) out.pid = Number(arg.slice(6));
    if (arg.startsWith("--sub=")) out.sub = arg.slice(6);
    if (arg.startsWith("--email=")) out.email = arg.slice(8);
    if (arg.startsWith("--secret=")) out.secret = arg.slice(9);
  }
  return out;
}

function partnerJwtSecret(pid, secret) {
  return secret ?? `partner-dev-secret-${pid}`;
}

const { pid, sub, email, secret } = parseArgs(process.argv.slice(2));
const jwtSecret = partnerJwtSecret(pid, secret);

const token = jwt.sign({ sub, email }, jwtSecret, {
  algorithm: "HS256",
  audience: EMBED_JWT_AUDIENCE,
  expiresIn: "15m",
});

console.log("\n=== Partner Embed JWT (dev) ===\n");
console.log(`pid: ${pid}`);
console.log(`sub: ${sub}`);
console.log(`aud: ${EMBED_JWT_AUDIENCE}`);
console.log("\nToken:\n");
console.log(token);

console.log("\n--- WebView: inject before load ---\n");
console.log(
  `window.__PARTNER_AUTH__ = { token: ${JSON.stringify(token)} };`
);

console.log("\n--- WebView: postMessage after load ---\n");
console.log(`window.postMessage(${JSON.stringify({ type: "PARTNER_AUTH", token })}, "*");`);

console.log("\n--- Campaign URL example (partner from merchant slug) ---\n");
console.log(`http://localhost:3000/cc/{merchant}/{campaign}`);

console.log("\n--- Convex action (requires SSO dev + signed platform key) ---\n");
console.log("service.auth.platformAuth.exchangeEmbedCredential");
console.log(JSON.stringify({ pid, credential: token, method: "jwt_local" }, null, 2));

console.log("\n--- Full live integration test ---\n");
console.log("npm run embed-auth:integration");
console.log("");
