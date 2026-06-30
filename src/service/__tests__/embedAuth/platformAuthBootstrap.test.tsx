import { render, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mintDevPartnerEmbedJwt } from "@/host/service/platformAuth/embedAuthTestUtils";
import { PlatformAuthProvider, usePlatformAuth } from "@/host/service/platformAuth/PlatformAuthProvider";
import { readStoredUser } from "@/host/service/platformAuth/platformSessionStorage";

const convexAction = vi.fn();
const convexSetAuth = vi.fn();

vi.mock("convex/react", () => ({
  useConvex: () => ({
    action: convexAction,
    setAuth: convexSetAuth,
  }),
}));

function BootstrapProbe({
  pid,
  credential,
  onDone,
}: {
  pid: number;
  credential: string;
  onDone: (uid: string | undefined) => void;
}) {
  const { bootstrapFromPartner, platformReady } = usePlatformAuth();

  useEffect(() => {
    void bootstrapFromPartner(pid, credential).then((session) => {
      onDone(session?.uid);
    });
  }, [bootstrapFromPartner, pid, credential, onDone]);

  return <div data-testid="ready">{platformReady ? "1" : "0"}</div>;
}

describe("PlatformAuthProvider bootstrapFromPartner", () => {
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
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls AuthManager.authenticate with jwt_local and persists session", async () => {
    const partnerJwt = mintDevPartnerEmbedJwt({ pid: 0, sub: "plat_user", email: "p@test.com" });
    const platformJwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfbWFwIn0.signature";

    convexAction.mockResolvedValue({
      uid: "usr_map",
      partner: 0,
      email: "p@test.com",
      platformAccessToken: platformJwt,
      platformAccessExpire: Date.now() + 3_600_000,
    });

    const onDone = vi.fn();
    render(
      <PlatformAuthProvider>
        <BootstrapProbe pid={0} credential={partnerJwt} onDone={onDone} />
      </PlatformAuthProvider>
    );

    await waitFor(() => {
      expect(convexAction.mock.calls.length).toBeGreaterThan(0);
    });

    const callArgs = convexAction.mock.calls[0][1];
    expect(callArgs.cid).toBe(2);
    expect(callArgs.partner).toBe(0);
    expect(callArgs.data.credential).toBe(partnerJwt);
    expect(callArgs.data.method).toBe("jwt_local");

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith("usr_map");
    });

    expect(readStoredUser()?.uid).toBe("usr_map");
    expect(readStoredUser()?.platformAccessToken).toBe(platformJwt);
  });
});
