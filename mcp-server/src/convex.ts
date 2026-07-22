import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { config } from "./config.js";

let client: ConvexHttpClient | null = null;

export function getConvex(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(config.convexUrl);
  }
  return client;
}

/** Function refs without depending on generated API types in this package. */
export const mcpApi: {
  whoami: any;
  listAvailableTournaments: any;
  getTournamentDetails: any;
  getPlayerSnapshot: any;
  joinTournament: any;
  collectTournament: any;
} = {
  whoami: anyApi.mcp.queries.whoami,
  listAvailableTournaments: anyApi.mcp.queries.listAvailableTournaments,
  getTournamentDetails: anyApi.mcp.queries.getTournamentDetails,
  getPlayerSnapshot: anyApi.mcp.queries.getPlayerSnapshot,
  joinTournament: anyApi.mcp.mutations.joinTournament,
  collectTournament: anyApi.mcp.mutations.collectTournament,
};

export function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}
