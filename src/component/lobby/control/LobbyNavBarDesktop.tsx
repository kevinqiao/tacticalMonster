import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "./lobbyNavControl.css";
import {
  LOBBY_NAV_DESKTOP_ICON_AUTH_LOGOUT,
  LOBBY_NAV_DESKTOP_ICON_AUTH_SIGNIN,
  LOBBY_NAV_DESKTOP_ICONS,
} from "./lobbyNavDesktopConfig";
import { LOBBY_NAV_LABEL, LOBBY_NAV_URI } from "./lobbyNavShared";

/** 桌面：带框图标按钮（HUD 快捷栏，CSS hover/active） */
export const LobbyNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();
  const { user, logout, askAuth, cancelAuth } = useUserManager();

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);
  const signOut = useCallback(() => {
    cancelAuth();
    logout();
  }, [logout, cancelAuth]);

  return (
    <nav className="lobby-nav-desktop" aria-label="Lobby navigation">
      <ul className="lobby-nav-desktop__list">
        {LOBBY_NAV_URI.map((uri, i) => (
          <li key={uri} className="lobby-nav-desktop__item">
            <button
              type="button"
              className="lobby-nav-desktop__btn"
              aria-label={LOBBY_NAV_LABEL[i]}
              onClick={() => openPage({ uri })}
            >
              <img
                className="lobby-nav-desktop__icon"
                src={LOBBY_NAV_DESKTOP_ICONS[i]}
                alt=""
                draggable={false}
              />
              <span className="lobby-nav-desktop__caption">
                {LOBBY_NAV_LABEL[i]}
              </span>
            </button>
          </li>
        ))}
        <li className="lobby-nav-desktop__item">
          {user?.uid ? (
            <button
              type="button"
              className="lobby-nav-desktop__btn lobby-nav-desktop__btn--auth"
              aria-label="Logout"
              onClick={signOut}
            >
              <img
                className="lobby-nav-desktop__icon"
                src={LOBBY_NAV_DESKTOP_ICON_AUTH_LOGOUT}
                alt=""
                draggable={false}
              />
              <span className="lobby-nav-desktop__caption">Logout</span>
            </button>
          ) : (
            <button
              type="button"
              className="lobby-nav-desktop__btn lobby-nav-desktop__btn--auth"
              aria-label="Sign in"
              onClick={signIn}
            >
              <img
                className="lobby-nav-desktop__icon"
                src={LOBBY_NAV_DESKTOP_ICON_AUTH_SIGNIN}
                alt=""
                draggable={false}
              />
              <span className="lobby-nav-desktop__caption">Sign in</span>
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
};
