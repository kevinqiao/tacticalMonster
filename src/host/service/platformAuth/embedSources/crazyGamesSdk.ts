declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
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
        user?: {
          isUserAccountAvailable?: boolean;
          getUserToken?: (callback?: (error: unknown, token: string) => void) => Promise<string> | void;
        };
      };
    };
  }
}

export type CrazyGamesEnvironment = "local" | "crazygames" | "disabled" | string;

const DEFAULT_CRAZYGAMES_PARTNER_PID = 100;

export function crazyGamesPartnerPid(): number {
  const raw = import.meta.env.VITE_CRAZYGAMES_PARTNER_PID;
  const n = raw != null && String(raw).trim() !== "" ? Number(raw) : DEFAULT_CRAZYGAMES_PARTNER_PID;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CRAZYGAMES_PARTNER_PID;
}

function crazyGamesSdk() {
  if (typeof window === "undefined") return undefined;
  return window.CrazyGames?.SDK;
}

export async function getCrazyGamesEnvironment(): Promise<CrazyGamesEnvironment | null> {
  const sdk = crazyGamesSdk();
  if (!sdk?.getEnvironment) return null;
  try {
    const env = await sdk.getEnvironment();
    return typeof env === "string" ? env : null;
  } catch {
    return null;
  }
}

export async function isCrazyGamesEmbedEnvironment(): Promise<boolean> {
  const env = await getCrazyGamesEnvironment();
  return env === "crazygames" || env === "local";
}

export function isCrazyGamesUserAccountAvailable(): boolean {
  const sdk = crazyGamesSdk();
  return sdk?.user?.isUserAccountAvailable === true;
}

export async function fetchCrazyGamesUserToken(): Promise<string | null> {
  const sdk = crazyGamesSdk();
  const getUserToken = sdk?.user?.getUserToken;
  if (!getUserToken) return null;
  try {
    const token = await getUserToken();
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export type CrazyGamesRewardedAdResult =
  | { ok: true; clientProof: string }
  | { ok: false; reason: "unfilled" | "sdk_error" | "unsupported" };

/** CrazyGames SDK v3 rewarded ad（须在用户手势内调用）。 */
export function requestCrazyGamesRewardedAd(): Promise<CrazyGamesRewardedAdResult> {
  const sdk = crazyGamesSdk();
  const requestAd = sdk?.ad?.requestAd;
  if (!requestAd) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CrazyGamesRewardedAdResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    requestAd("rewarded", {
      adStarted: () => {
        /* 游戏侧 orchestrator 负责 pause audio/input */
      },
      adFinished: () => {
        finish({ ok: true, clientProof: "crazygames_rewarded" });
      },
      adError: () => {
        finish({ ok: false, reason: "unfilled" });
      },
    });

    window.setTimeout(() => {
      finish({ ok: false, reason: "sdk_error" });
    }, 120_000);
  });
}
