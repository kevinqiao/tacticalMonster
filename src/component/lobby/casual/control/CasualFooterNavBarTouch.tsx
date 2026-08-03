import React, { useCallback, useId, useMemo } from "react";
import { usePageManager } from "host/service/PageManager";
import "../../tactical/control/footer/FooterNavControl.css";
import navHoverSprite from "../../tactical/control/footer/assets/nav-hover-sprite.png";
import { FooterNavHitPath } from "../../tactical/control/footer/FooterNavHitPath";
import {
  NAV_VIEWBOX,
  WIDTH_PCT,
  footerNavCellRectPathD,
} from "../../tactical/control/footer/FooterNavCellLayout";
import { CASUAL_FOOTER_NAV_LABEL, CASUAL_FOOTER_NAV_URI } from "./FooterNavCasual";

/** 横屏触摸：与 tactical 同款条带；前 5 格为休闲 Tab，末格装饰（登出见顶栏） */
export const CasualFooterNavBarTouch: React.FC = () => {
  const { openPage } = usePageManager();
  const hoverPatternId = useId().replace(/:/g, "");

  const pathDs = useMemo(
    () => WIDTH_PCT.map((_, index) => footerNavCellRectPathD(index)),
    []
  );

  const cellPlacements = useMemo(() => {
    let offsetPct = 0;
    return WIDTH_PCT.map((w, index) => {
      const o = offsetPct;
      offsetPct += w;
      return { offsetPct: o, index, pathD: pathDs[index] };
    });
  }, [pathDs]);

  const onPathKeyDown = useCallback(
    (action: () => void) => (e: React.KeyboardEvent<SVGPathElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    },
    []
  );

  const patternFill = `url(#${hoverPatternId})`;

  return (
    <div className="footer-nav-strip">
      <svg
        className="footer-nav-svg"
        viewBox={NAV_VIEWBOX}
        preserveAspectRatio="none"
        role="presentation"
      >
        <defs>
          <pattern
            id={hoverPatternId}
            patternUnits="userSpaceOnUse"
            width={480}
            height={44}
          >
            <image
              href={navHoverSprite}
              width={480}
              height={44}
              preserveAspectRatio="none"
            />
          </pattern>
        </defs>
        {cellPlacements.map(({ pathD, index }) => {
          if (index < 5) {
            const uri = CASUAL_FOOTER_NAV_URI[index];
            const label = CASUAL_FOOTER_NAV_LABEL[index];
            return (
              <FooterNavHitPath
                key={uri}
                d={pathD}
                fill={patternFill}
                ariaLabel={label}
                onClick={() => openPage({ uri })}
                onKeyDown={onPathKeyDown(() => openPage({ uri }))}
              />
            );
          }
          return (
            <path
              key="casual-strip-tail"
              d={pathD}
              fill="transparent"
              style={{ pointerEvents: "none" }}
              aria-hidden
            />
          );
        })}
      </svg>
      <div className="footer-nav-label-layer">
        {cellPlacements.map(({ offsetPct, index }) => {
          const label = index < 5 ? CASUAL_FOOTER_NAV_LABEL[index] : "";
          return (
            <div
              key={index < 5 ? CASUAL_FOOTER_NAV_URI[index] : "tail"}
              className="footer-nav-label-slot"
              style={{
                left: `${offsetPct}%`,
                width: `${WIDTH_PCT[index]}%`,
              }}
            >
              {label ? (
                <span className="footer-nav-hit__label">{label}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
