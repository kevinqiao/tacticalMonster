declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init?: () => Promise<void>;
        /** v3: sync property after init (`local` | `crazygames` | `disabled`). */
        environment?: string;
        getEnvironment?: (callback?: (error: unknown, environment: string) => void) => Promise<string> | void;
        ad?: {
          requestAd?: (
            type: "rewarded" | "midgame",
            callbacks: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: unknown, errorData?: unknown) => void;
            }
          ) => void;
        };
        banner?: {
          requestResponsiveBanner?: (containerId: string) => void | Promise<void>;
          clearAllBanners?: () => void;
        };
        user?: {
          isUserAccountAvailable?: boolean;
          getUserToken?: (callback?: (error: unknown, token: string) => void) => Promise<string> | void;
          /** Opens CrazyGames account login UI; resolves with user or rejects if cancelled. */
          showAuthPrompt?: () => Promise<unknown>;
        };
        game?: {
          gameplayStart?: () => void;
          gameplayStop?: () => void;
          /** SDK v3 */
          loadingStart?: () => void;
          loadingStop?: () => void;
          /** Older / alternate names still seen in docs */
          sdkGameLoadingStart?: () => void;
          sdkGameLoadingStop?: () => void;
          happytime?: () => void;
        };
      };
    };
  }
}

export type CrazyGamesEnvironment = "local" | "crazygames" | "disabled" | string;

const DEFAULT_CRAZYGAMES_PARTNER_PID = 100;

let initPromise: Promise<boolean> | null = null;
let initSucceeded = false;
let cachedEnvironment: CrazyGamesEnvironment | null = null;

export function crazyGamesPartnerPid(): number {
  const raw = import.meta.env.VITE_CRAZYGAMES_PARTNER_PID;
  const n = raw != null && String(raw).trim() !== "" ? Number(raw) : DEFAULT_CRAZYGAMES_PARTNER_PID;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CRAZYGAMES_PARTNER_PID;
}

function crazyGamesSdk() {
  if (typeof window === "undefined") return undefined;
  return window.CrazyGames?.SDK;
}

function readSdkEnvironment(sdk: NonNullable<ReturnType<typeof crazyGamesSdk>>): CrazyGamesEnvironment | null {
  try {
    // v3 preferred: sync property (docs). Avoid method calls that throw pre-init / when disabled.
    const env = sdk.environment;
    if (typeof env === "string" && env.trim()) return env.trim();
  } catch {
    /* getter may throw before init */
  }
  return null;
}

function isActiveCrazyGamesEnvironment(env: CrazyGamesEnvironment | null | undefined): boolean {
  return env === "crazygames" || env === "local";
}

/** True after `SDK.init()` resolved successfully (env may still be `disabled`). */
export function isCrazyGamesSdkInitialized(): boolean {
  return initSucceeded;
}

/**
 * SDK is safe to call only on CrazyGames / local. On brainwar.games (and any other host)
 * init succeeds with `environment: "disabled"` and further API access throws GeneralError.
 */
export function isCrazyGamesSdkUsable(): boolean {
  return initSucceeded && isActiveCrazyGamesEnvironment(cachedEnvironment);
}

/** Safe module probe — never throws (optional chaining does not catch getter throws). */
export function safeCrazyGamesHasModule(
  module: "banner" | "ad" | "user" | "game",
  member?: string
): boolean {
  if (!isCrazyGamesSdkUsable()) return false;
  try {
    const mod = crazyGamesSdk()?.[module] as Record<string, unknown> | undefined;
    if (!mod) return false;
    if (!member) return true;
    return typeof mod[member] === "function" || mod[member] != null;
  } catch {
    return false;
  }
}

let gameplayActive = false;
let loadingActive = false;

function callGameMethod(
  primary: "gameplayStart" | "gameplayStop" | "loadingStart" | "loadingStop",
  fallback?: "sdkGameLoadingStart" | "sdkGameLoadingStop"
): boolean {
  if (!isCrazyGamesSdkUsable()) return false;
  try {
    const game = crazyGamesSdk()?.game;
    if (!game) return false;
    const fn = game[primary] ?? (fallback ? game[fallback] : undefined);
    if (typeof fn !== "function") return false;
    fn.call(game);
    return true;
  } catch (error) {
    console.warn(`[CrazyGames] game.${primary} failed`, error);
    return false;
  }
}

/** First call marks initial-load size for CrazyGames QA; also resume after menus/ads. */
export function crazyGamesGameplayStart(): void {
  if (gameplayActive) return;
  if (!callGameMethod("gameplayStart")) return;
  gameplayActive = true;
}

export function crazyGamesGameplayStop(): void {
  if (!gameplayActive) return;
  callGameMethod("gameplayStop");
  gameplayActive = false;
}

export function crazyGamesLoadingStart(): void {
  if (loadingActive) return;
  if (!callGameMethod("loadingStart", "sdkGameLoadingStart")) return;
  loadingActive = true;
}

export function crazyGamesLoadingStop(): void {
  if (!loadingActive) return;
  callGameMethod("loadingStop", "sdkGameLoadingStop");
  loadingActive = false;
}

export function isCrazyGamesGameplayActive(): boolean {
  return gameplayActive;
}

const SDK_INIT_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * CrazyGames SDK v3: script load only exposes `window.CrazyGames.SDK`;
 * APIs throw until `await SDK.init()` resolves. Deduped across callers.
 * If the script is not present yet, returns false without caching (preload may still inject it).
 */
export function ensureCrazyGamesSdkInitialized(): Promise<boolean> {
  if (initPromise) return initPromise;
  const sdk = crazyGamesSdk();
  if (!sdk) return Promise.resolve(false);
  initPromise = (async () => {
    const current = crazyGamesSdk();
    if (!current) return false;
    const init = current.init;
    if (typeof init !== "function") {
      // Legacy / stub: treat present modules as ready only if env looks active.
      cachedEnvironment = readSdkEnvironment(current) ?? "disabled";
      initSucceeded = isActiveCrazyGamesEnvironment(cachedEnvironment);
      return initSucceeded;
    }
    try {
      // Parent CG shell may already be initializing; never block auth forever on init.
      await withTimeout(Promise.resolve(init.call(current)), SDK_INIT_TIMEOUT_MS, "CrazyGames SDK.init");
    } catch (error) {
      // Init may still leave environment readable; never let this become an uncaught UI error.
      console.warn("[CrazyGames] SDK.init failed or timed out", error);
    }
    cachedEnvironment = readSdkEnvironment(current);
    // Prefer reading env after init even when init threw — disabled hosts still "initialize".
    if (cachedEnvironment == null) {
      try {
        if (typeof current.getEnvironment === "function") {
          const env = await withTimeout(
            Promise.resolve(current.getEnvironment() as Promise<string>),
            3_000,
            "CrazyGames getEnvironment"
          );
          if (typeof env === "string" && env.trim()) cachedEnvironment = env.trim();
        }
      } catch {
        cachedEnvironment = "disabled";
      }
    }
    initSucceeded = true;
    let accountAvailable: boolean | null = null;
    try {
      accountAvailable = current.user?.isUserAccountAvailable === true;
    } catch {
      accountAvailable = null;
    }
    console.info("[CrazyGames] SDK ready", {
      environment: cachedEnvironment,
      accountAvailable,
    });
    return true;
  })();
  return initPromise;
}

export async function getCrazyGamesEnvironment(): Promise<CrazyGamesEnvironment | null> {
  const ready = await ensureCrazyGamesSdkInitialized();
  if (!ready) return null;
  return cachedEnvironment;
}

export async function isCrazyGamesEmbedEnvironment(): Promise<boolean> {
  const env = await getCrazyGamesEnvironment();
  return isActiveCrazyGamesEnvironment(env);
}

export function isCrazyGamesUserAccountAvailable(): boolean {
  if (!isCrazyGamesSdkUsable()) return false;
  try {
    return crazyGamesSdk()?.user?.isUserAccountAvailable === true;
  } catch {
    return false;
  }
}

const USER_TOKEN_TIMEOUT_MS = 10_000;

function normalizeUserToken(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function fetchCrazyGamesUserToken(): Promise<string | null> {
  const usable = await isCrazyGamesEmbedEnvironment();
  if (!usable) return null;
  const user = crazyGamesSdk()?.user;
  const getUserToken = user?.getUserToken;
  if (!user || typeof getUserToken !== "function") {
    console.warn("[CrazyGames] getUserToken missing");
    return null;
  }
  console.info("[CrazyGames] getUserToken start");
  try {
    // SDK v3 is Promise-only: `await SDK.user.getUserToken()` — do NOT pass a callback
    // (that becomes the options arg and crashes inside the SDK on `.logger`).
    const raw = await withTimeout(
      Promise.resolve(getUserToken.call(user)),
      USER_TOKEN_TIMEOUT_MS,
      "CrazyGames getUserToken"
    );
    const token = normalizeUserToken(raw);
    console.info("[CrazyGames] getUserToken done", { ok: Boolean(token), chars: token?.length ?? 0 });
    return token;
  } catch (error) {
    console.warn("[CrazyGames] getUserToken failed", error);
    return null;
  }
}

/** Prompt CrazyGames site login when the player has no CG account linked. */
export async function showCrazyGamesAuthPrompt(): Promise<boolean> {
  const usable = await isCrazyGamesEmbedEnvironment();
  if (!usable) return false;
  let showAuthPrompt: (() => Promise<unknown>) | undefined;
  try {
    showAuthPrompt = crazyGamesSdk()?.user?.showAuthPrompt;
  } catch {
    return false;
  }
  if (typeof showAuthPrompt !== "function") return false;
  try {
    const user = await showAuthPrompt();
    return user != null;
  } catch {
    return false;
  }
}

/**
 * Resolve a CG user JWT: use existing account, or open auth prompt once when unavailable.
 */
export async function ensureCrazyGamesUserToken(): Promise<string | null> {
  const usable = await isCrazyGamesEmbedEnvironment();
  if (!usable) return null;

  let token = await fetchCrazyGamesUserToken();
  if (token) return token;

  if (!isCrazyGamesUserAccountAvailable()) {
    console.info("[CrazyGames] account unavailable — opening auth prompt");
    const ok = await showCrazyGamesAuthPrompt();
    if (!ok) {
      console.info("[CrazyGames] auth prompt cancelled or failed");
      return null;
    }
  } else {
    console.warn("[CrazyGames] account available but token empty — retry once");
  }

  token = await fetchCrazyGamesUserToken();
  return token;
}

export type CrazyGamesVideoAdType = "rewarded" | "midgame";

export type CrazyGamesVideoAdResult =
  | { ok: true; type: CrazyGamesVideoAdType; clientProof: string }
  | { ok: false; reason: "unfilled" | "sdk_error" | "unsupported" };

export type CrazyGamesRewardedAdResult = CrazyGamesVideoAdResult;

export type CrazyGamesVideoAdHooks = {
  onAdStarted?: () => void;
};

/**
 * CrazyGames SDK v3 video ad (midgame / rewarded). Callback-based; must keep `this` on `SDK.ad`.
 * Midgame may be requested at any natural break — SDK enforces frequency/cooldown.
 * Rewarded should be user-initiated.
 */
export async function requestCrazyGamesVideoAd(
  type: CrazyGamesVideoAdType,
  hooks?: CrazyGamesVideoAdHooks
): Promise<CrazyGamesVideoAdResult> {
  const usable = await isCrazyGamesEmbedEnvironment();
  if (!usable) {
    return { ok: false, reason: "unsupported" };
  }
  let ad: NonNullable<NonNullable<Window["CrazyGames"]>["SDK"]>["ad"];
  let requestAd: NonNullable<NonNullable<typeof ad>["requestAd"]>;
  try {
    ad = crazyGamesSdk()?.ad;
    requestAd = ad?.requestAd;
  } catch {
    return { ok: false, reason: "unsupported" };
  }
  if (!ad || typeof requestAd !== "function") {
    return { ok: false, reason: "unsupported" };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CrazyGamesVideoAdResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      requestAd.call(ad, type, {
        adStarted: () => {
          hooks?.onAdStarted?.();
        },
        adFinished: () => {
          finish({ ok: true, type, clientProof: `crazygames_${type}` });
        },
        adError: () => {
          // Includes unfilled / cooldown / adblock — game must continue.
          finish({ ok: false, reason: "unfilled" });
        },
      });
    } catch {
      finish({ ok: false, reason: "sdk_error" });
      return;
    }

    window.setTimeout(() => {
      finish({ ok: false, reason: "sdk_error" });
    }, 120_000);
  });
}

/** CrazyGames rewarded ad（须在用户手势内调用）。 */
export async function requestCrazyGamesRewardedAd(): Promise<CrazyGamesRewardedAdResult> {
  return requestCrazyGamesVideoAd("rewarded");
}

/** Midgame / interstitial between levels — SDK ignores if on cooldown. */
export async function requestCrazyGamesMidgameAd(
  hooks?: CrazyGamesVideoAdHooks
): Promise<CrazyGamesVideoAdResult> {
  return requestCrazyGamesVideoAd("midgame", hooks);
}

/** Test helper */
export function resetCrazyGamesSdkInitForTests(): void {
  initPromise = null;
  initSucceeded = false;
  cachedEnvironment = null;
  gameplayActive = false;
  loadingActive = false;
}
