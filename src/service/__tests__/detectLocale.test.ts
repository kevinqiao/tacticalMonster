import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APP_LOCALE_STORAGE_KEY,
  APP_LOCALE_USER_SET_KEY,
} from "@/i18n/supportedLocales";
import {
  detectBrowserLocale,
  readUserLocaleChoice,
  resolveInitialLocale,
} from "@/i18n/detectLocale";

describe("detectLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("prefers navigator.languages order for browser locale", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-GB", "zh-CN"],
      language: "zh-CN",
    });
    expect(detectBrowserLocale()).toBe("en-US");
  });

  it("uses browser locale when user has not explicitly chosen", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-US"],
      language: "en-US",
    });
    expect(resolveInitialLocale()).toBe("en-US");
    expect(readUserLocaleChoice()).toBe(false);
  });

  it("uses stored locale after user explicitly chose in app", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-US"],
      language: "en-US",
    });
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "zh-CN");
    localStorage.setItem(APP_LOCALE_USER_SET_KEY, "1");
    expect(resolveInitialLocale()).toBe("zh-CN");
  });

  it("ignores stale stored locale without user-set flag", () => {
    vi.stubGlobal("navigator", {
      languages: ["en-US"],
      language: "en-US",
    });
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "zh-CN");
    expect(resolveInitialLocale()).toBe("en-US");
  });
});
