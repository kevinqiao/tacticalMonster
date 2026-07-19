import { query } from "../../_generated/server";
import { isPasskitConfigured } from "./passkitEnv";

/** Public: hide "Add to Wallet" when certs missing. */
export const passkitAvailability = query({
  args: {},
  handler: async () => ({
    appleConfigured: isPasskitConfigured(),
    googleConfigured: false,
  }),
});
