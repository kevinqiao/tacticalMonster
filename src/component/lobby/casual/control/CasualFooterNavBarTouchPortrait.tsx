import React, { useCallback, useEffect, useMemo, useState } from "react";
import { normalizePageUri, parseLocation } from "util/PageUtils";
import { usePageManager } from "service/PageManager";
import {
  FOOTER_NAV_DESKTOP_ICONS,
} from "../../tactical/control/footer/FooterNavDesktopConfig";
import "../../tactical/control/footer/FooterNavControl.css";
import { CASUAL_FOOTER_NAV_LABEL, CASUAL_FOOTER_NAV_URI } from "./FooterNavCasual";

const getActiveIndexFromLocation = (): number => {
  const current = normalizePageUri(parseLocation()?.uri ?? "");
  const idx = CASUAL_FOOTER_NAV_URI.findIndex(
    (uri) => normalizePageUri(uri) === current
  );
  return idx >= 0 ? idx : 0;
};

/** 竖屏触摸专用：与 tactical 同款底栏，休闲为 3tab + CSS 变体 */
export const CasualFooterNavBarTouchPortrait: React.FC = () => {
  const { openPage, pageEvent } = usePageManager();
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    getActiveIndexFromLocation()
  );
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(getActiveIndexFromLocation());
  }, [pageEvent]);

  useEffect(() => {
    const onPopState = () => setActiveIndex(getActiveIndexFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (pressedIndex == null) return;
    const timer = window.setTimeout(() => setPressedIndex(null), 180);
    return () => window.clearTimeout(timer);
  }, [pressedIndex]);

  const onOpen = useCallback(
    (index: number) => {
      setPressedIndex(index);
      setActiveIndex(index);
      openPage({ uri: CASUAL_FOOTER_NAV_URI[index] });
    },
    [openPage]
  );

  const items = useMemo(
    () =>
      CASUAL_FOOTER_NAV_URI.map((uri, index) => ({
        uri,
        label: CASUAL_FOOTER_NAV_LABEL[index],
        icon: FOOTER_NAV_DESKTOP_ICONS[index] ?? FOOTER_NAV_DESKTOP_ICONS[0],
      })),
    []
  );

  return (
    <nav
      className="footer-nav-touch-portrait footer-nav-touch-portrait--casual"
      aria-label="Casual lobby navigation"
    >
      <ul
        className="footer-nav-touch-portrait__list"
        style={
          {
            "--footer-active-index": activeIndex,
          } as React.CSSProperties
        }
      >
        <li
          className="footer-nav-touch-portrait__activeOverlay"
          aria-hidden="true"
          role="presentation"
        />
        {items.map((item, index) => {
          const active = index === activeIndex;
          const pressed = index === pressedIndex;
          return (
            <li key={item.uri} className="footer-nav-touch-portrait__item">
              <button
                type="button"
                className={
                  active
                    ? `footer-nav-touch-portrait__btn footer-nav-touch-portrait__btn--active${
                        pressed ? " footer-nav-touch-portrait__btn--pressed" : ""
                      }`
                    : `footer-nav-touch-portrait__btn${
                        pressed ? " footer-nav-touch-portrait__btn--pressed" : ""
                      }`
                }
                aria-label={item.label}
                onClick={() => onOpen(index)}
              >
                <span className="footer-nav-touch-portrait__iconWrap">
                  <img
                    className="footer-nav-touch-portrait__icon"
                    src={item.icon}
                    alt=""
                    draggable={false}
                  />
                </span>
                <span className="footer-nav-touch-portrait__label">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

