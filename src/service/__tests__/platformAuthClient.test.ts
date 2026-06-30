import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  bindPlatformAuthToClients,
  clearPlatformAuthOnClients,
  registerConvexAuthClient,
} from "@/host/service/platformAuth/convexAuthRegistry";
import { looksLikePlatformJwt } from "@/host/service/platformAuth/platformAccessToken";
import {
  mergePlatformAccess,
  platformTokenFromUser,
  readStoredUser,
  writeStoredUser,
} from "@/host/service/platformAuth/platformSessionStorage";

describe("convexAuthRegistry", () => {
  function mockFetchAuthClient() {
    const setAuth = vi.fn();
    Object.defineProperty(setAuth, "length", { value: 2 });
    return setAuth;
  }

  it("binds setAuth on registered websocket clients", async () => {
    const setAuth = mockFetchAuthClient();
    const unregister = registerConvexAuthClient({ setAuth });
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    bindPlatformAuthToClients(async () => jwt);
    expect(setAuth).toHaveBeenCalled();
    const fetcher = setAuth.mock.calls.at(-1)![0] as () => Promise<string | null>;
    await expect(fetcher()).resolves.toBe(jwt);
    unregister();
  });

  it("binds JWT string on ConvexHttpClient-style clients", async () => {
    const setAuth = vi.fn();
    const clearAuth = vi.fn();
    Object.defineProperty(setAuth, "length", { value: 1 });
    registerConvexAuthClient({ setAuth, clearAuth });
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    bindPlatformAuthToClients(async () => jwt);
    await vi.waitFor(() => expect(setAuth).toHaveBeenCalledWith(jwt));
  });

  it("does not bind malformed tokens", async () => {
    const setAuth = mockFetchAuthClient();
    registerConvexAuthClient({ setAuth });
    bindPlatformAuthToClients(async () => "not-a-jwt");
    const fetcher = setAuth.mock.calls.at(-1)![0] as () => Promise<string | null>;
    await expect(fetcher()).resolves.toBeNull();
  });

  it("clears auth on all clients", () => {
    const setAuth = mockFetchAuthClient();
    registerConvexAuthClient({ setAuth });
    clearPlatformAuthOnClients();
    expect(setAuth).toHaveBeenCalled();
  });

  it("binds auth to clients registered after bindPlatformAuthToClients", async () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    bindPlatformAuthToClients(async () => jwt);

    const setAuth = mockFetchAuthClient();
    registerConvexAuthClient({ setAuth });
    expect(setAuth).toHaveBeenCalled();
    const fetcher = setAuth.mock.calls.at(-1)![0] as () => Promise<string | null>;
    await expect(fetcher()).resolves.toBe(jwt);
  });
});

describe("platformSessionStorage helpers", () => {
  it("returns token when valid JWT shape and not expired", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    const token = platformTokenFromUser({
      uid: "u1",
      platformAccessToken: jwt,
      platformAccessExpire: Date.now() + 60_000,
    });
    expect(token).toBe(jwt);
  });

  it("returns null for non-JWT legacy token strings", () => {
    const token = platformTokenFromUser({
      uid: "u1",
      platformAccessToken: "abc",
      platformAccessExpire: Date.now() + 60_000,
    });
    expect(token).toBeNull();
  });

  it("returns null when expired", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    const token = platformTokenFromUser({
      uid: "u1",
      platformAccessToken: jwt,
      platformAccessExpire: Date.now() - 1,
    });
    expect(token).toBeNull();
  });

  it("mergePlatformAccess preserves uid", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    const merged = mergePlatformAccess(
      { uid: "u1" },
      { platformAccessToken: jwt, platformAccessExpire: 999 }
    );
    expect(merged.uid).toBe("u1");
    expect(merged.platformAccessToken).toBe(jwt);
  });
});

describe("readStoredUser", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips user json", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.signature";
    writeStoredUser({ uid: "x", platformAccessToken: jwt });
    expect(readStoredUser()?.uid).toBe("x");
  });

  it("strips invalid platformAccessToken on read", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ uid: "x", platformAccessToken: "legacy-random-token" })
    );
    expect(readStoredUser()?.platformAccessToken).toBeUndefined();
  });
});
