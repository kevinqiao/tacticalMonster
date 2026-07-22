/** SHA-256 hex digest for API key hashing (Web Crypto, works in Convex runtime). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const KEY_PREFIX = "mcp_sk_";

/** Generate a raw API key. Returned once at creation; only the hash is stored. */
export function generateRawApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const encoded = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${KEY_PREFIX}${encoded}`;
}

export function getKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, Math.min(12, rawKey.length));
}

export { KEY_PREFIX };
