# Remote HTTP MCP Server (Convex + API Key)

Scheme B: a remote MCP gateway for multi-user / Agent platforms.  
MCP speaks Streamable HTTP; Convex owns data, scopes, and business logic.

```
Agent Platform / Cursor (remote)
        │  Authorization: Bearer mcp_sk_…
        ▼
   mcp-server  (/mcp)
        │  ConvexHttpClient
        ▼
 tournament Convex  (mcp/* functions + mcp_api_keys)
```

## Quick start

### 1. Deploy Convex MCP module

From the tournament Convex project:

```bash
cd src/convex/tournament
npx convex env set MCP_ADMIN_SECRET "replace-with-long-random"
npx convex deploy   # or: npx convex dev
```

### 2. Create an API key

```bash
cd mcp-server
npm install

CONVEX_URL=https://beloved-mouse-699.convex.cloud \
MCP_ADMIN_SECRET=replace-with-long-random \
node scripts/create-api-key.mjs \
  --name "agent-platform" \
  --tenant default \
  --scopes read,write
```

Copy the returned `apiKey` (shown once).

### 3. Run the HTTP MCP server

```bash
cp .env.example .env
# set CONVEX_URL and MCP_API_KEYS=mcp_sk_…

npm run start
# listens on http://0.0.0.0:8787/mcp
```

### 4. Point an Agent platform at it

```bash
curl -s -X POST http://127.0.0.1:8787/mcp \
  -H 'Authorization: Bearer mcp_sk_…' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Cursor / remote MCP client example:

```json
{
  "mcpServers": {
    "tacticalmonster": {
      "url": "https://your-mcp-host.example.com/mcp",
      "headers": {
        "Authorization": "Bearer mcp_sk_…"
      }
    }
  }
}
```

## Endpoints

| Path | Mode | Notes |
|------|------|--------|
| `GET /healthz` | — | Liveness |
| `ALL /mcp` | Stateless | Preferred for serverless / multi-tenant |
| `ALL /mcp/session` | Stateful | Session header `mcp-session-id` |

## Tools

| Tool | Convex fn | Scope |
|------|-----------|--------|
| `whoami` | `mcp.queries.whoami` | read |
| `list_available_tournaments` | `mcp.queries.listAvailableTournaments` | read |
| `get_tournament_details` | `mcp.queries.getTournamentDetails` | read |
| `get_player_snapshot` | `mcp.queries.getPlayerSnapshot` | read |
| `join_tournament` | `mcp.mutations.joinTournament` | write |
| `collect_tournament` | `mcp.mutations.collectTournament` | write |

## Security model

1. **Gateway auth** — `mcp-server` rejects requests without a Bearer key listed in `MCP_API_KEYS`.
2. **Convex auth** — every `mcp/*` function re-validates the same key (SHA-256 hash in `mcp_api_keys`) and checks scopes (`read` / `write` / `admin`).
3. **Keys** — raw keys are never stored; only hashes + short prefixes.
4. **Bootstrap** — first key via `MCP_ADMIN_SECRET`; later keys via an `admin`-scoped key.

## Deploy notes

- Run `mcp-server` on Fly / Railway / Render / any Node 20+ host.
- Set `ALLOWED_HOSTS` to your public hostname when binding `0.0.0.0`.
- Put the Convex deployment URL in `CONVEX_URL` (cloud or self-hosted).
- Rotate keys by creating a new key and revoking the old one (`mcp.keys:revokeApiKey`).

## Extending

1. Add a Convex query/mutation under `src/convex/tournament/convex/mcp/`.
2. Call `requireAuth(ctx, apiKey, "read"|"write")` first.
3. Register a matching `server.tool(...)` in `mcp-server/src/server.ts`.
