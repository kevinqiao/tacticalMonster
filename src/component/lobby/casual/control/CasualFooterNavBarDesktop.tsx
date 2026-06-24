import React from "react";
import { usePageManager } from "host/service/PageManager";
import "../../tactical/control/footer/FooterNavControl.css";
import { CASUAL_LOBBY_NAV_ICONS } from "../assets/casualLobbyIcons";
import { CASUAL_NAV_MENU_ITEMS } from "./NavSharedCasual";

/** 桌面：底栏仅 5 个 Tab（登出见顶栏） */
export const CasualFooterNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();

  return (
    <nav className="footer-nav-desktop footer-nav-desktop--casual" aria-label="Lobby navigation">
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
                src={CASUAL_LOBBY_NAV_ICONS[index]}
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
