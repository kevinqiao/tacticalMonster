/**
 * Shared CLI arg helpers for operation scripts.
 */

/** True when argv asks for help (help | -h | --help as any token). */
export function wantsHelp(argv) {
  return argv.some((a) => a === "help" || a === "-h" || a === "--help");
}

export function getArg(argv, names) {
  const list = Array.isArray(names) ? names : [names];
  for (const name of list) {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx !== -1 && idx + 1 < argv.length && !String(argv[idx + 1]).startsWith("-")) {
      return argv[idx + 1];
    }
  }
  return undefined;
}

function isClearToken(v) {
  return v === "null" || v === "default" || v === "clear" || v === "inherit";
}

/**
 * Parse on|off|true|false|1|0|null|default|clear.
 * @returns {boolean|null|undefined} undefined when raw is undefined
 */
export function parseToggle(raw) {
  if (raw === undefined) return undefined;
  const v = String(raw).trim().toLowerCase();
  if (v === "on" || v === "true" || v === "1" || v === "yes") return true;
  if (v === "off" || v === "false" || v === "0" || v === "no") return false;
  if (isClearToken(v)) return null;
  throw new Error(
    `toggle_invalid:${raw} (use on|off|true|false|1|0|null|default|clear)`
  );
}

/**
 * Parse enum or null/clear. allowed is lowercase string set.
 * @returns {string|null|undefined}
 */
export function parseNullableEnum(raw, allowed, label = "value") {
  if (raw === undefined) return undefined;
  const v = String(raw).trim().toLowerCase();
  if (isClearToken(v)) return null;
  if (allowed.has(v)) return v;
  throw new Error(
    `${label}_invalid:${raw} (${[...allowed].join("|")}|null)`
  );
}

/** @returns {number|null|undefined} */
export function parseNullableInt(raw, label = "number") {
  if (raw === undefined) return undefined;
  const v = String(raw).trim().toLowerCase();
  if (isClearToken(v) || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${label}_invalid:${raw}`);
  return Math.floor(n);
}

export function labelToggle(v) {
  if (v === true) return "on";
  if (v === false) return "off";
  if (v === null) return "null (inherit/clear)";
  if (v === undefined) return "(unchanged)";
  return String(v);
}

export function parseCommonArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    prod: argv.includes("--prod"),
    prune: argv.includes("--prune"),
    noJson: argv.includes("--no-json"),
    allowProd: argv.includes("--allow-prod"),
    partner: getArg(argv, ["--partner", "--slug"]) ?? argv.find((a) => !a.startsWith("-")),
    skipSso: argv.includes("--skip-sso"),
    skipPortal: argv.includes("--skip-portal"),
    skipLobbies: argv.includes("--skip-lobbies"),
    skipTowns: argv.includes("--skip-towns"),
    skipShopSkus: argv.includes("--skip-shop-skus"),
    skipShopSettings: argv.includes("--skip-shop-settings"),
    skipStaff: argv.includes("--skip-staff"),
    onlyLobbies: argv.includes("--only-lobbies"),
    onlyTowns: argv.includes("--only-towns"),
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
    wantStep(flags, "towns") ||
    wantStep(flags, "shopSkus") ||
    wantStep(flags, "shopSettings")
  );
}

export function wantStep(flags, step) {
  const only =
    flags.onlySso ||
    flags.onlyPortal ||
    flags.onlyLobbies ||
    flags.onlyTowns ||
    flags.onlyShopSkus ||
    flags.onlyShopSettings ||
    flags.onlyStaff;
  if (only) {
    if (step === "sso") return flags.onlySso;
    if (step === "portal") return flags.onlyPortal;
    if (step === "lobbies") return flags.onlyLobbies;
    if (step === "towns") return flags.onlyTowns;
    if (step === "shopSkus") return flags.onlyShopSkus;
    if (step === "shopSettings") return flags.onlyShopSettings;
    if (step === "staff") return flags.onlyStaff;
    return false;
  }
  if (step === "sso") return !flags.skipSso;
  if (step === "portal") return !flags.skipPortal;
  if (step === "lobbies") return !flags.skipLobbies;
  if (step === "towns") return !flags.skipTowns;
  if (step === "shopSkus") return !flags.skipShopSkus;
  if (step === "shopSettings") return !flags.skipShopSettings;
  if (step === "staff") return !flags.skipStaff;
  return true;
}

export function convexProdArgs(prod) {
  return prod ? ["--prod"] : [];
}
