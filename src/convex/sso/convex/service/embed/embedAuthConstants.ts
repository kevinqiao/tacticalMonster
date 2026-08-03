/** Virtual auth_channel cid for Partner WebView embed (see authChannelCatalog). */
export { EMBED_AUTH_CHANNEL_CID } from "../auth/authChannelCatalog";

export const EMBED_JWT_AUDIENCE = "tacticalmonster-embed";

export const EMBED_AUTH_METHODS = [
  "jwt_local",
  "crazygames_jwt",
  "code_exchange",
  "session_introspect",
] as const;

export type EmbedAuthMethod = (typeof EMBED_AUTH_METHODS)[number];
