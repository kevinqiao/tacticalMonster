import React, { useCallback, useId, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "../../tactical/control/footer/FooterNavControl.css";
import navHoverSprite from "../../tactical/control/footer/assets/nav-hover-sprite.png";
import { FooterNavHitPath } from "../../tactical/control/footer/FooterNavHitPath";
import {
  NAV_VIEWBOX,
  WIDTH_PCT,
  footerNavCellRectPathD,
} from "../../tactical/control/footer/FooterNavCellLayout";
import { CASUAL_FOOTER_NAV_LABEL, CASUAL_FOOTER_NAV_URI } from "./FooterNavCasual";

/** 横屏触摸：与 tactical 同款条带；前两格外为占位装饰格（无导航），末格为登录态 */
export const CasualFooterNavBarTouch: React.FC = () => {
  const { openPage } = usePageManager();
  const { user, logout, askAuth, cancelAuth } = useUserManager();
  const hoverPatternId = useId().replace(/:/g, "");

  const pathDs = useMemo(
    () => WIDTH_PCT.map((_, index) => footerNavCellRectPathD(index)),
    []
  );

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);
  const signOut = useCallback(() => {
    cancelAuth();
    logout();
  }, [logout, cancelAuth]);

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
          if (index < 3) {
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
          if (index === 3 || index === 4) {
            return (
              <path
                key={`casual-strip-dead-${index}`}
                d={pathD}
                fill="transparent"
                style={{ pointerEvents: "none" }}
                aria-hidden
              />
            );
          }
          return user?.uid ? (
            <FooterNavHitPath
              key="logout"
              d={pathD}
              fill={patternFill}
              ariaLabel="Logout"
              onClick={signOut}
              onKeyDown={onPathKeyDown(signOut)}
            />
          ) : (
            <FooterNavHitPath
              key="signin"
              d={pathD}
              fill={patternFill}
              ariaLabel="Sign in"
              onClick={signIn}
              onKeyDown={onPathKeyDown(signIn)}
            />
          );
        })}
      </svg>
      <div className="footer-nav-label-layer">
        {cellPlacements.map(({ offsetPct, index }) => {
          const label =
            index < 3
              ? CASUAL_FOOTER_NAV_LABEL[index]
              : index < 5
                ? ""
                : user?.uid
                  ? "Logout"
                  : "SignIn";
          return (
            <div
              key={
                index < 3
                  ? CASUAL_FOOTER_NAV_URI[index]
                  : index < 5
                    ? `dead-${index}`
                    : user?.uid
                      ? "logout"
                      : "signin"
              }
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
