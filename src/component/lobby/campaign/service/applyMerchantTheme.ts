export type MerchantThemeJson = {
  version?: number;
  sourceUrl?: string;
  mode?: "light" | "dark";
  brand?: {
    primary?: string;
    onPrimary?: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    fontFamily?: string;
    radiusMd?: string;
  };
  shell?: {
    ctaBg?: string;
    ctaText?: string;
    headerBg?: string;
    posterFrameRadius?: string;
  };
};

const ROOT_ID = "campaign-theme-root";

export function applyMerchantTheme(theme: MerchantThemeJson | null | undefined): () => void {
  const el = document.documentElement;
  const brand = theme?.brand;
  const shell = theme?.shell;
  if (!brand && !shell) return () => undefined;

  const prev = new Map<string, string>();
  const set = (name: string, value: string | undefined) => {
    if (!value) return;
    prev.set(name, el.style.getPropertyValue(name));
    el.style.setProperty(name, value);
  };

  set("--ui-color-primary", brand?.primary ?? shell?.ctaBg);
  set("--ui-color-on-primary", brand?.onPrimary ?? shell?.ctaText);
  set("--ui-color-bg", brand?.background);
  set("--ui-color-surface", brand?.surface);
  set("--ui-color-text", brand?.text);
  set("--ui-color-text-muted", brand?.textMuted);
  set("--ui-font-family", brand?.fontFamily);
  set("--ui-radius-md", brand?.radiusMd ?? shell?.posterFrameRadius);
  set("--campaign-header-bg", shell?.headerBg);
  set("--campaign-cta-bg", shell?.ctaBg ?? brand?.primary);
  set("--campaign-cta-text", shell?.ctaText ?? brand?.onPrimary);

  el.setAttribute("data-campaign-theme", ROOT_ID);

  return () => {
    for (const [name, value] of prev.entries()) {
      if (value) el.style.setProperty(name, value);
      else el.style.removeProperty(name);
    }
    el.removeAttribute("data-campaign-theme");
  };
}
