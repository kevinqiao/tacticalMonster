import React, { useCallback, useId, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "./lobbyNavControl.css";
import navHoverSprite from "./assets/nav-hover-sprite.png";
import lobbyNavCellsSvg from "./assets/lobby-nav-cells.svg?raw";
import { LobbyNavHitPath } from "./LobbyNavHitPath";
import { LOBBY_NAV_LABEL, LOBBY_NAV_URI } from "./lobbyNavShared";
import { NAV_VIEWBOX, WIDTH_PCT, parseLobbyNavCellPathDs } from "./navCellLayout";

/** 触摸 / 平板：整栏条图 + SVG 热区 + LobbyNavHitPath */
export const LobbyNavBarTouch: React.FC = () => {
  const { openPage } = usePageManager();
  const { user, logout, askAuth, cancelAuth } = useUserManager();
  const hoverPatternId = useId().replace(/:/g, "");

  const pathDs = useMemo(
    () => parseLobbyNavCellPathDs(lobbyNavCellsSvg),
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
    <div className="lobby-nav-strip">
      <svg
        className="lobby-nav-svg"
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
            const uri = LOBBY_NAV_URI[index];
            const label = LOBBY_NAV_LABEL[index];
            return (
              <LobbyNavHitPath
                key={uri}
                d={pathD}
                fill={patternFill}
                ariaLabel={label}
                onClick={() => openPage({ uri })}
                onKeyDown={onPathKeyDown(() => openPage({ uri }))}
              />
            );
          }
          return user?.uid ? (
            <LobbyNavHitPath
              key="logout"
              d={pathD}
              fill={patternFill}
              ariaLabel="Logout"
              onClick={signOut}
              onKeyDown={onPathKeyDown(signOut)}
            />
          ) : (
            <LobbyNavHitPath
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
      <div className="lobby-nav-label-layer">
        {cellPlacements.map(({ offsetPct, index }) => {
          const label =
            index < 5
              ? LOBBY_NAV_LABEL[index]
              : user?.uid
                ? "Logout"
                : "SignIn";
          return (
            <div
              key={
                index < 5
                  ? LOBBY_NAV_URI[index]
                  : user?.uid
                    ? "logout"
                    : "signin"
              }
              className="lobby-nav-label-slot"
              style={{
                left: `${offsetPct}%`,
                width: `${WIDTH_PCT[index]}%`,
              }}
            >
              <span className="lobby-nav-hit__label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
