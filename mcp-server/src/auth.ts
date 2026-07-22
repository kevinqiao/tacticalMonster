import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

export type AuthedRequest = Request & {
  mcpApiKey?: string;
};

/**
 * Bearer API key auth for remote Agent platforms.
 * The same key is forwarded into Convex MCP functions for server-side scope checks.
 */
export function requireApiKey(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const key = match?.[1]?.trim();

  if (!key || !config.apiKeys.has(key)) {
    res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid Authorization: Bearer <MCP_API_KEY>",
    });
    return;
  }

  req.mcpApiKey = key;
  next();
}
