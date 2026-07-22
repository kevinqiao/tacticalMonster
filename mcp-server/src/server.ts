import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResult, getConvex, jsonResult, mcpApi } from "./convex.js";

/**
 * Create a fresh MCP server instance (stateless-friendly for Streamable HTTP).
 * apiKey is the Bearer token from the HTTP request, forwarded into Convex.
 */
export function createMcpServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "tacticalmonster-mcp",
    version: "0.1.0",
  });

  const convex = getConvex();

  server.tool(
    "whoami",
    "Return the authenticated MCP API key identity (tenant, scopes).",
    {},
    async () => {
      try {
        const data = await convex.query(mcpApi.whoami, { apiKey });
        return jsonResult(data);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "whoami failed");
      }
    },
  );

  server.tool(
    "list_available_tournaments",
    "List tournaments available for a player, optionally filtered by game type.",
    {
      uid: z.string().describe("Player uid"),
      gameType: z.string().optional().describe("Optional game type filter"),
    },
    async ({ uid, gameType }) => {
      try {
        const data = await convex.query(mcpApi.listAvailableTournaments, {
          apiKey,
          uid,
          gameType,
        });
        return jsonResult(data);
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : "list_available_tournaments failed",
        );
      }
    },
  );

  server.tool(
    "get_tournament_details",
    "Get details for a tournament by Convex document id.",
    {
      tournamentId: z.string().describe("Tournament document id"),
    },
    async ({ tournamentId }) => {
      try {
        const data = await convex.query(mcpApi.getTournamentDetails, {
          apiKey,
          tournamentId: tournamentId as any,
        });
        return jsonResult(data);
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : "get_tournament_details failed",
        );
      }
    },
  );

  server.tool(
    "get_player_snapshot",
    "Get a player's profile and inventory snapshot.",
    {
      uid: z.string().describe("Player uid"),
    },
    async ({ uid }) => {
      try {
        const data = await convex.query(mcpApi.getPlayerSnapshot, { apiKey, uid });
        return jsonResult(data);
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : "get_player_snapshot failed",
        );
      }
    },
  );

  server.tool(
    "join_tournament",
    "Join a tournament for a player (requires write scope).",
    {
      uid: z.string().describe("Player uid"),
      typeId: z.string().describe("Tournament type id"),
      tournamentId: z.string().optional().describe("Optional existing tournament id"),
    },
    async ({ uid, typeId, tournamentId }) => {
      try {
        const data = await convex.mutation(mcpApi.joinTournament, {
          apiKey,
          uid,
          typeId,
          tournamentId,
        });
        return jsonResult(data);
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : "join_tournament failed");
      }
    },
  );

  server.tool(
    "collect_tournament",
    "Collect rewards for a settled tournament participation (requires write scope).",
    {
      uid: z.string().describe("Player uid"),
      tournamentId: z.string().describe("Tournament id"),
    },
    async ({ uid, tournamentId }) => {
      try {
        const data = await convex.mutation(mcpApi.collectTournament, {
          apiKey,
          uid,
          tournamentId,
        });
        return jsonResult(data);
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : "collect_tournament failed",
        );
      }
    },
  );

  return server;
}
