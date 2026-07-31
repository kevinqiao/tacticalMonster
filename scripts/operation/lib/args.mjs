/**
 * Shared CLI arg helpers for operation scripts.
 */

export function parseCommonArgs(argv) {
  const get = (name) => {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };

  return {
    apply: argv.includes("--apply"),
    prod: argv.includes("--prod"),
    partner: get("--partner") ?? get("--slug") ?? argv.find((a) => !a.startsWith("-")),
    skipSso: argv.includes("--skip-sso"),
    skipPortal: argv.includes("--skip-portal"),
    skipLobbies: argv.includes("--skip-lobbies"),
    skipShopSkus: argv.includes("--skip-shop-skus"),
    skipShopSettings: argv.includes("--skip-shop-settings"),
    skipStaff: argv.includes("--skip-staff"),
    onlyLobbies: argv.includes("--only-lobbies"),
    onlyPortal: argv.includes("--only-portal"),
    onlySso: argv.includes("--only-sso"),
    onlyShopSkus: argv.includes("--only-shop-skus"),
    onlyShopSettings: argv.includes("--only-shop-settings"),
    onlyStaff: argv.includes("--only-staff"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

/** Steps that need Portal HTTP bridge. */
export function needsPortalBridge(flags) {
  return (
    wantStep(flags, "portal") ||
    wantStep(flags, "lobbies") ||
    wantStep(flags, "shopSkus") ||
    wantStep(flags, "shopSettings")
  );
}

export function wantStep(flags, step) {
  const only =
    flags.onlySso ||
    flags.onlyPortal ||
    flags.onlyLobbies ||
    flags.onlyShopSkus ||
    flags.onlyShopSettings ||
    flags.onlyStaff;
  if (only) {
    if (step === "sso") return flags.onlySso;
    if (step === "portal") return flags.onlyPortal;
    if (step === "lobbies") return flags.onlyLobbies;
    if (step === "shopSkus") return flags.onlyShopSkus;
    if (step === "shopSettings") return flags.onlyShopSettings;
    if (step === "staff") return flags.onlyStaff;
    return false;
  }
  if (step === "sso") return !flags.skipSso;
  if (step === "portal") return !flags.skipPortal;
  if (step === "lobbies") return !flags.skipLobbies;
  if (step === "shopSkus") return !flags.skipShopSkus;
  if (step === "shopSettings") return !flags.skipShopSettings;
  if (step === "staff") return !flags.skipStaff;
  return true;
}

export function convexProdArgs(prod) {
  return prod ? ["--prod"] : [];
}
