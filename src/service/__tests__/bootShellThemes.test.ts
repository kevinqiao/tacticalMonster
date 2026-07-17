import { describe, expect, it } from "vitest";

import {
  BOOT_SHELL_THEMES,
  getBootBgImageLayers,
  resolveBootShellIdFromPathname,
  resolveBootShellTheme,
} from "@/host/bootShellThemes";

describe("bootShellThemes", () => {
  it("maps admin routes to distinct shells", () => {
    expect(resolveBootShellIdFromPathname("/platform/admin")).toBe("platform");
    expect(resolveBootShellIdFromPathname("/partner/admin")).toBe("partner");
    expect(resolveBootShellIdFromPathname("/partner/operation")).toBe("partnerOperation");
    expect(resolveBootShellIdFromPathname("/campaign/merchant")).toBe("partnerOperation");
  });

  it("uses portal visuals for portal routes", () => {
    const theme = resolveBootShellTheme("/portal/block_blast");
    expect(theme.id).toBe("portal");
    expect(theme.bgLandscape).toContain("bg-16x9");
    expect(getBootBgImageLayers(theme)).toContain("url(");
  });

  it("uses gradient-only admin themes", () => {
    const theme = BOOT_SHELL_THEMES.platform;
    expect(theme.bgLandscape).toBeUndefined();
    expect(getBootBgImageLayers(theme)).toBe(theme.gradientLandscape);
  });
});
