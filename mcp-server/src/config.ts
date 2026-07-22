import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const config = {
  convexUrl: required("CONVEX_URL"),
  port: Number(process.env.PORT ?? "8787"),
  host: process.env.HOST ?? "0.0.0.0",
  allowedHosts: (process.env.ALLOWED_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
  /** Valid API keys for the HTTP gateway (Bearer tokens). */
  apiKeys: new Set(
    (process.env.MCP_API_KEYS ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  ),
};

if (config.apiKeys.size === 0) {
  throw new Error("MCP_API_KEYS must contain at least one key (comma-separated)");
}
