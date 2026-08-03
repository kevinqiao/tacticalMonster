import { CAMPAIGN_URL_PREFIX, CAMPAIGN_URL_SEGMENT } from "@/host/util/appUrlSegments";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const CAMPAIGN_CAROUSEL_AUTO_MS = 8000;
export const CAMPAIGN_CAROUSEL_PAUSE_MS = 30_000;

function campaignPath(partnerSlug: string, campaignSlug: string) {
  return `${CAMPAIGN_URL_PREFIX}/${partnerSlug}/${campaignSlug}`;
}

function slugFromLocation(partnerSlug: string): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== CAMPAIGN_URL_SEGMENT || parts[1] !== partnerSlug || !parts[2]) {
    return null;
  }
  return parts[2];
}

export function useCampaignCarousel(opts: {
  partnerSlug: string;
  slideSlugs: string[];
  initialCampaignSlug: string;
  enabled: boolean;
  isSwitchBlocked?: () => boolean;
}) {
  const { partnerSlug, slideSlugs, initialCampaignSlug, enabled, isSwitchBlocked } = opts;

  const initialIndex = useMemo(() => {
    const idx = slideSlugs.indexOf(initialCampaignSlug);
    return idx >= 0 ? idx : 0;
  }, [slideSlugs, initialCampaignSlug]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const syncUrl = useCallback(
    (index: number) => {
      const slug = slideSlugs[index];
      if (!slug) return;
      const path = campaignPath(partnerSlug, slug);
      if (window.location.pathname !== path) {
        window.history.replaceState(null, "", path);
      }
    },
    [partnerSlug, slideSlugs]
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    if (width <= 0) return;
    scrollSyncRef.current = true;
    track.scrollTo({ left: index * width, behavior });
    window.setTimeout(() => {
      scrollSyncRef.current = false;
    }, behavior === "smooth" ? 400 : 50);
  }, []);

  const goTo = useCallback(
    (index: number, options?: { syncUrl?: boolean; behavior?: ScrollBehavior; userInitiated?: boolean }) => {
      if (!enabled) return;
      if (index < 0 || index >= slideSlugs.length || index === activeIndexRef.current) return;
      if (isSwitchBlocked?.()) return;

      if (options?.userInitiated) {
        pauseUntilRef.current = Date.now() + CAMPAIGN_CAROUSEL_PAUSE_MS;
      }

      setActiveIndex(index);
      if (options?.syncUrl !== false) {
        syncUrl(index);
      }
      scrollToIndex(index, options?.behavior ?? "smooth");
    },
    [enabled, slideSlugs.length, isSwitchBlocked, syncUrl, scrollToIndex]
  );

  const goNext = useCallback(
    (userInitiated = false) => {
      const next = (activeIndexRef.current + 1) % slideSlugs.length;
      goTo(next, { userInitiated });
    },
    [goTo, slideSlugs.length]
  );

  const goPrev = useCallback(
    (userInitiated = false) => {
      const prev = (activeIndexRef.current - 1 + slideSlugs.length) % slideSlugs.length;
      goTo(prev, { userInitiated });
    },
    [goTo, slideSlugs.length]
  );

  const onTrackScroll = useCallback(() => {
    if (scrollSyncRef.current) return;
    const track = trackRef.current;
    if (!track || !enabled) return;
    const width = track.clientWidth;
    if (width <= 0) return;
    const index = Math.round(track.scrollLeft / width);
    if (index === activeIndexRef.current) return;
    if (index < 0 || index >= slideSlugs.length) return;
    if (isSwitchBlocked?.()) {
      scrollToIndex(activeIndexRef.current, "auto");
      return;
    }
    pauseUntilRef.current = Date.now() + CAMPAIGN_CAROUSEL_PAUSE_MS;
    setActiveIndex(index);
    syncUrl(index);
  }, [enabled, slideSlugs.length, isSwitchBlocked, scrollToIndex, syncUrl]);

  useEffect(() => {
    if (!enabled) return;
    scrollToIndex(initialIndex, "auto");
    syncUrl(initialIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [enabled]);

  // When live slide list changes (campaign goes live/offline), clamp index and sync URL.
  useEffect(() => {
    if (slideSlugs.length === 0) return;

    const urlSlug = slugFromLocation(partnerSlug);
    const urlIndex = urlSlug != null ? slideSlugs.indexOf(urlSlug) : -1;
    const nextIndex =
      urlIndex >= 0
        ? urlIndex
        : activeIndexRef.current >= slideSlugs.length
          ? slideSlugs.length - 1
          : activeIndexRef.current;

    if (nextIndex !== activeIndexRef.current) {
      setActiveIndex(nextIndex);
      scrollToIndex(nextIndex, "auto");
    }

    syncUrl(nextIndex);
  }, [partnerSlug, slideSlugs, scrollToIndex, syncUrl]);

  useEffect(() => {
    if (!enabled) return;
    const onPopState = () => {
      const slug = slugFromLocation(partnerSlug);
      if (!slug) return;
      const index = slideSlugs.indexOf(slug);
      if (index < 0 || index === activeIndexRef.current) return;
      if (isSwitchBlocked?.()) return;
      setActiveIndex(index);
      scrollToIndex(index, "auto");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, partnerSlug, slideSlugs, isSwitchBlocked, scrollToIndex]);

  useEffect(() => {
    if (!enabled || slideSlugs.length <= 1) return;
    const id = window.setInterval(() => {
      if (isSwitchBlocked?.()) {
        pauseUntilRef.current = Date.now() + CAMPAIGN_CAROUSEL_PAUSE_MS;
        return;
      }
      if (Date.now() < pauseUntilRef.current) return;
      goNext(false);
    }, CAMPAIGN_CAROUSEL_AUTO_MS);
    return () => window.clearInterval(id);
  }, [enabled, slideSlugs.length, goNext, isSwitchBlocked]);

  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = () => {
      pauseUntilRef.current = Date.now() + CAMPAIGN_CAROUSEL_PAUSE_MS;
    };
    const track = trackRef.current;
    track?.addEventListener("pointerdown", onPointerDown);
    return () => track?.removeEventListener("pointerdown", onPointerDown);
  }, [enabled, activeIndex]);

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      scrollToIndex(activeIndexRef.current, "auto");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, scrollToIndex]);

  const activeSlug = slideSlugs[activeIndex] ?? initialCampaignSlug;

  return {
    activeIndex,
    activeSlug,
    trackRef,
    goTo,
    goNext,
    goPrev,
    onTrackScroll,
    carouselEnabled: enabled && slideSlugs.length > 1,
  };
}
