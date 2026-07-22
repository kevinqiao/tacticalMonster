import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { AuthedRequest } from "./auth.js";
import { requireApiKey } from "./auth.js";
import { config } from "./config.js";
import { createMcpServer } from "./server.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "tacticalmonster-mcp", version: "0.1.0" });
});

/**
 * Stateless Streamable HTTP MCP endpoint.
 * Each request gets a fresh McpServer + transport (safe for multi-tenant gateways).
 */
app.all("/mcp", requireApiKey, async (req: AuthedRequest, res) => {
  const host = (req.headers.host ?? "").split(":")[0];
  if (
    config.host === "0.0.0.0" &&
    config.allowedHosts.length > 0 &&
    host &&
    !config.allowedHosts.includes(host)
  ) {
    res.status(403).json({ error: "forbidden_host", host });
    return;
  }

  const apiKey = req.mcpApiKey!;
  const server = createMcpServer(apiKey);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

/** Optional stateful session map for clients that need resumability. */
const sessions = new Map<
  string,
  { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createMcpServer> }
>();

app.all("/mcp/session", requireApiKey, async (req: AuthedRequest, res) => {
  const apiKey = req.mcpApiKey!;
  const sessionId = req.header("mcp-session-id");

  try {
    if (sessionId && sessions.has(sessionId)) {
      const existing = sessions.get(sessionId)!;
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }

    const server = createMcpServer(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server });
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) sessions.delete(id);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP session request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(config.port, config.host, () => {
  console.log(
    `MCP server listening on http://${config.host}:${config.port}/mcp (stateless) and /mcp/session (stateful)`,
  );
});
