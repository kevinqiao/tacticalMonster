import type { AuthConfig } from "convex/server";

import {
  PLATFORM_JWT_AUDIENCE,
  PLATFORM_JWT_ISSUER,
  PLATFORM_JWKS_DATA_URI,
} from "../../shared/platformAuth/platformJwtConstants";

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: PLATFORM_JWT_AUDIENCE,
      issuer: PLATFORM_JWT_ISSUER,
      jwks: PLATFORM_JWKS_DATA_URI,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
