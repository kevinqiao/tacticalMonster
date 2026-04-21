import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "./FooterNavControl.css";
import {
  FOOTER_NAV_DESKTOP_ICON_AUTH_LOGOUT,
  FOOTER_NAV_DESKTOP_ICON_AUTH_SIGNIN,
  FOOTER_NAV_DESKTOP_ICONS,
} from "./FooterNavDesktopConfig";
import { FOOTER_NAV_LABEL, FOOTER_NAV_URI } from "./FooterNavShared";

/** 桌面：带框图标按钮（HUD 快捷栏，CSS hover/active） */
export const FooterNavBarDesktop: React.FC = () => {
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
    <nav className="footer-nav-desktop" aria-label="Lobby navigation">
      <ul className="footer-nav-desktop__list">
        {FOOTER_NAV_URI.map((uri, i) => (
          <li key={uri} className="footer-nav-desktop__item">
            <button
              type="button"
              className="footer-nav-desktop__btn"
              aria-label={FOOTER_NAV_LABEL[i]}
              onClick={() => openPage({ uri })}
            >
              <img
                className="footer-nav-desktop__icon"
                src={FOOTER_NAV_DESKTOP_ICONS[i]}
                alt=""
                draggable={false}
              />
              <span className="footer-nav-desktop__caption">
                {FOOTER_NAV_LABEL[i]}
              </span>
            </button>
          </li>
        ))}
        <li className="footer-nav-desktop__item">
          {user?.uid ? (
            <button
              type="button"
              className="footer-nav-desktop__btn footer-nav-desktop__btn--auth"
              aria-label="Logout"
              onClick={signOut}
            >
              <img
                className="footer-nav-desktop__icon"
                src={FOOTER_NAV_DESKTOP_ICON_AUTH_LOGOUT}
                alt=""
                draggable={false}
              />
              <span className="footer-nav-desktop__caption">Logout</span>
            </button>
          ) : (
            <button
              type="button"
              className="footer-nav-desktop__btn footer-nav-desktop__btn--auth"
              aria-label="Sign in"
              onClick={signIn}
            >
              <img
                className="footer-nav-desktop__icon"
                src={FOOTER_NAV_DESKTOP_ICON_AUTH_SIGNIN}
                alt=""
                draggable={false}
              />
              <span className="footer-nav-desktop__caption">Sign in</span>
            </button>
          )}
        </li>
      </ul>
    </nav>
  );
};
