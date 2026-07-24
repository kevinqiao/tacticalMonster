import { describe, expect, it } from "vitest";

import {
  computePortalViewportLayout,
  isPortalViewportPortrait,
} from "host/service/ads/display/viewportLayout";

describe("computePortalViewportLayout", () => {
  it("creates left/right gutters on ultrawide desktop", () => {
    const layout = computePortalViewportLayout({
      windowWidth: 2560,
      windowHeight: 1440,
      portrait: false,
    });
    expect(layout.platform).toBe("desktop");
    expect(layout.gutters.left).not.toBeNull();
    expect(layout.gutters.right).not.toBeNull();
    expect(layout.stageRect.w).toBeGreaterThan(1400);
  });

  it("omits side gutters on mobile portrait", () => {
    const layout = computePortalViewportLayout({
      windowWidth: 390,
      windowHeight: 844,
      portrait: true,
    });
    expect(layout.platform).toBe("mobile");
    expect(layout.gutters.left).toBeNull();
    expect(layout.gutters.right).toBeNull();
  });

  it("auto-detects phone portrait when portrait arg is omitted", () => {
    expect(isPortalViewportPortrait(390, 844)).toBe(true);
    const layout = computePortalViewportLayout({
      windowWidth: 390,
      windowHeight: 844,
    });
    expect(layout.orientation).toBe("portrait");
    expect(layout.designHeight).toBe(2560);
    // Contain-fit tall design (~693px), not forced landscape strip (~292px).
    expect(layout.stageRect.h).toBeGreaterThan(600);

  });
});


