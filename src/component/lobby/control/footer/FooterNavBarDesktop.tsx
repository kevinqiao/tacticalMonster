import { useModalManager } from "@/service/ModalManager";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { NAV_MENU_ITEMS } from "../NavShared";
import "./FooterNavControl.css";
import {
  FOOTER_NAV_DESKTOP_ICON_AUTH_LOGOUT,
  FOOTER_NAV_DESKTOP_ICON_AUTH_SIGNIN,
  FOOTER_NAV_DESKTOP_ICONS,
} from "./FooterNavDesktopConfig";
/** 桌面：带框图标按钮（HUD 快捷栏，CSS hover/active） */
export const FooterNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();
  const { openModal } = useModalManager();
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
        {NAV_MENU_ITEMS.map((item, index) => (
          <li key={item.uri} className="footer-nav-desktop__item">
            <button
              type="button"
              className="footer-nav-desktop__btn"
              aria-label={item.label}
              onClick={() => {
                if (item.type === "page") {
                  openPage({ uri: item.uri });
                } else {
                  openModal({ name: item.uri, effect: item.effect });
                }
              }}
            >
              <img
                className="footer-nav-desktop__icon"
                src={FOOTER_NAV_DESKTOP_ICONS[index]}
                alt=""
                draggable={false}
              />
              <span className="footer-nav-desktop__caption">
                {item.label}
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
