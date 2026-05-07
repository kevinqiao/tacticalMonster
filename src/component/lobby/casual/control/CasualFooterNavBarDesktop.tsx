import React from "react";
import { usePageManager } from "host/service/PageManager";
import "../../tactical/control/footer/FooterNavControl.css";
import { CASUAL_NAV_MENU_ITEMS } from "./NavSharedCasual";
import { FOOTER_NAV_DESKTOP_ICONS } from "../../tactical/control/footer/FooterNavDesktopConfig";

/** 桌面：底栏仅 5 个 Tab（登出见顶栏） */
export const CasualFooterNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();

  return (
    <nav className="footer-nav-desktop" aria-label="Lobby navigation">
      <ul className="footer-nav-desktop__list">
        {CASUAL_NAV_MENU_ITEMS.map((item, index) => (
          <li key={item.uri} className="footer-nav-desktop__item">
            <button
              type="button"
              className="footer-nav-desktop__btn"
              aria-label={item.label}
              onClick={() => {
                if (item.type === "page") {
                  openPage({ uri: item.uri });
                }
              }}
            >
              <img
                className="footer-nav-desktop__icon"
                src={FOOTER_NAV_DESKTOP_ICONS[index]}
                alt=""
                draggable={false}
              />
              <span className="footer-nav-desktop__caption">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
