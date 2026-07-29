import { afterEach, describe, expect, it } from "vitest";

import {
  MIN_SAFE_VIEWPORT_PX,
  readSafeWindowViewportSize,
} from "host/service/ads/display/safeViewportSize";
import {
  computePortalViewportLayout,
  isPortalViewportPortrait,
} from "host/service/ads/display/viewportLayout";

describe("readSafeWindowViewportSize", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it("falls back when window reports near-zero size (hidden tab)", () => {
    // Seed a good reading first.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 720 });
    expect(readSafeWindowViewportSize().usedFallback).toBe(false);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 0 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 0 });
    const fallback = readSafeWindowViewportSize();
    expect(fallback.usedFallback).toBe(true);
    expect(fallback.width).toBeGreaterThanOrEqual(MIN_SAFE_VIEWPORT_PX);
    expect(fallback.height).toBeGreaterThanOrEqual(MIN_SAFE_VIEWPORT_PX);
  });
});

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


