import { useModalManager } from "host/service/ModalManager";
import { usePageManager } from "host/service/PageManager";
import { useSharedValue } from "host/service/SharedPageDataManager";
import type { User } from "host/service/UserManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import avatarPlaceholderUrl from "../../tactical/control/head/assets/avatar-placeholder.svg?url";
import { HEAD_NAV_DESKTOP_ICON_AUTH_SIGNIN } from "../../tactical/control/head/HeadNavDesktopConfig";
import { useCasualPlatform } from "../service/useCasualPlatformManager";
import "../style.css";
import { CasualHudCurrencyBars } from "./CasualHudCurrencyBars";
import "./HeadNavControl.css";
import {
  CASUAL_BATTLE_PASS_MODAL_OPEN,
  CASUAL_HEAD_NAV_MENU_ITEMS,
  CASUAL_PLAYER_PROFILE_MODAL_OPEN,
} from "./HeadNavSharedCasual";

function avatarPhotoUrlFromUser(u: User | null): string | undefined {
  if (!u) return undefined;
  const d = (u.data ?? null) as Record<string, unknown> | null;
  const raw = d?.["imageUrl"] ?? d?.["avatar"] ?? d?.["picture"] ?? d?.["photoUrl"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  const uAny = u as { picture?: string; imageUrl?: string; avatar?: string };
  for (const v of [uAny.picture, uAny.imageUrl, uAny.avatar]) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function levelFromUser(u: User | null): number {
  const lv = u?.data?.level;
  return typeof lv === "number" && !Number.isNaN(lv) ? Math.min(999, Math.max(0, Math.floor(lv))) : 1;
}

function HeadNavMenuGlyph() {
  return (
    <svg
      className="head-nav-hud__menu-svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="3" y="11" width="18" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="3" y="17" width="18" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}

const MENU_EDGE_GAP_PX = 4;

/** 竖屏：Portal + body 固定定位，避免顶栏 overflow:hidden 裁切 */
function HeadNavPortraitMenuPortal({
  open,
  slideIn,
  anchorRect,
  onPanelTransitionEnd,
  onBackdropPointerDown,
  onItemPick,
}: {
  open: boolean;
  slideIn: boolean;
  anchorRect: DOMRect | null;
  onPanelTransitionEnd: React.TransitionEventHandler<HTMLDivElement>;
  onBackdropPointerDown: () => void;
  onItemPick: (item: {
    label: string;
    type: "page" | "modal";
    uri: string;
    effect?: { name: string; args?: any };
  }) => void;
}) {
  if (!open || typeof document === "undefined" || !anchorRect) {
    return null;
  }

  const vw =
    typeof window !== "undefined" ? window.innerWidth : anchorRect.width;
  const rightPx = vw - anchorRect.right;
  const topPx = anchorRect.bottom + MENU_EDGE_GAP_PX;
  const panelMaxW = "min(12rem, calc(100vw - 16px))";

  return createPortal(
    <div className="head-nav-hud__menu-layer" style={{ zIndex: 5300 }}>
      <div
        className="head-nav-hud__menu-backdrop"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          onBackdropPointerDown();
        }}
      />
      <div
        className={
          slideIn
            ? "head-nav-hud__menu-panel head-nav-hud__menu-panel--open"
            : "head-nav-hud__menu-panel"
        }
        style={{
          top: topPx,
          right: rightPx,
          maxWidth: panelMaxW,
        }}
        role="menu"
        aria-label="Lobby quick menu"
        onTransitionEnd={onPanelTransitionEnd}
      >
        {CASUAL_HEAD_NAV_MENU_ITEMS.map((item) => (
          <button
            key={item.uri}
            type="button"
            className="head-nav-hud__menu-item"
            role="menuitem"
            onClick={() => onItemPick(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

/**
 * 休闲顶栏：左玩家 / 登录（点头像打开个人资料 Modal，内含 Logout）；货币区与 tactical 同款；右通行证。竖屏保留汉堡菜单。底栏负责 Tab 切换。 */
export const CasualHeadNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();
  const { openModal } = useModalManager();
  const casual = useCasualPlatform();
  const { user, askAuth } = useUserManager();
  const orientation = useSharedValue("casualLobby.layout.orientation");
  /** 与 HeadNavControl 壳一致：仅 strict true 视为竖屏 HUD */
  const isPortraitHud = orientation === "portrait";

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPortalOpen, setMenuPortalOpen] = useState(false);
  const [menuSlideIn, setMenuSlideIn] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

  const measureMenuAnchor = useCallback(() => {
    const el = menuBtnRef.current;
    if (el) setMenuAnchorRect(el.getBoundingClientRect());
  }, []);

  const closeMenuAfterExit = useCallback(() => {
    setMenuSlideIn(false);
  }, []);

  const openPortraitMenu = useCallback(() => {
    const el = menuBtnRef.current;
    if (!el) return;
    setMenuAnchorRect(el.getBoundingClientRect());
    setMenuPortalOpen(true);
    setMenuSlideIn(false);
  }, []);

  useEffect(() => {
    if (!menuPortalOpen) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMenuSlideIn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [menuPortalOpen]);

  useEffect(() => {
    if (isPortraitHud) return;
    if (!menuPortalOpen) return;
    setMenuPortalOpen(false);
    setMenuSlideIn(false);
    setMenuAnchorRect(null);
  }, [isPortraitHud, menuPortalOpen]);

  useEffect(() => {
    if (!menuPortalOpen) return;
    const sync = () => {
      measureMenuAnchor();
    };
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [menuPortalOpen, measureMenuAnchor]);

  useEffect(() => {
    if (!menuPortalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenuAfterExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuPortalOpen, closeMenuAfterExit]);

  const onMenuPanelTransitionEnd: React.TransitionEventHandler<HTMLDivElement> =
    useCallback(
      (e) => {
        if (e.propertyName !== "transform") return;
        if (!menuSlideIn) {
          setMenuPortalOpen(false);
          setMenuAnchorRect(null);
        }
      },
      [menuSlideIn]
    );

  const onPortraitMenuItem = useCallback(
    (item: { label: string, type: "page" | "modal", uri: string, effect?: { name: string, args?: any } }) => {
      if (item.type === "page") {
        openPage({ uri: item.uri });
      } else {
        openModal({ name: item.uri, effect: item.effect });
      }
      closeMenuAfterExit();
    },
    [openPage, openModal, closeMenuAfterExit]
  );

  const onMenuBtnClick = useCallback(() => {
    if (menuPortalOpen && menuSlideIn) {
      closeMenuAfterExit();
      return;
    }
    openPortraitMenu();
  }, [menuPortalOpen, menuSlideIn, closeMenuAfterExit, openPortraitMenu]);

  const openBattlePass = useCallback(() => {
    openModal({
      name: CASUAL_BATTLE_PASS_MODAL_OPEN.name,
      effect: CASUAL_BATTLE_PASS_MODAL_OPEN.effect,
    });
  }, [openModal]);

  const openRolloutReplayDev = useCallback(() => {
    openModal({ name: "solitaire_rollout_replay_dev" });
  }, [openModal]);

  const openVictoryAnimLabDev = useCallback(() => {
    openModal({ name: "solitaire_victory_anim_dev" });
  }, [openModal]);

  /** 顶栏 Rollout 入口（隐藏；功能仍可通过 openModal 打开） */
  const showRolloutDevNavEntry = false;
  const showVictoryAnimLabEntry = import.meta.env.DEV;

  const openPlayerProfile = useCallback(() => {
    openModal({
      name: CASUAL_PLAYER_PROFILE_MODAL_OPEN.name,
      effect: CASUAL_PLAYER_PROFILE_MODAL_OPEN.effect,
    });
  }, [openModal]);

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);

  const u: User | null = user?.uid ? (user as User) : null;
  const photoUrl = useMemo(() => avatarPhotoUrlFromUser(u), [user]);
  /** 无远程头像时走打包内静态图，保证顶栏立即可见、满框可验 */
  const resolvedAvatar = useMemo(
    () => photoUrl || avatarPlaceholderUrl,
    [photoUrl]
  );

  const level = useMemo(() => levelFromUser(u), [user]);

  const currencyHud =
    user?.uid ? <CasualHudCurrencyBars player={casual.casualPlayer} /> : null;

  const stretch = <div className="head-nav-hud__stretch" aria-hidden />;

  const rolloutReplayDevEntry =
    import.meta.env.DEV && showRolloutDevNavEntry ? (
    <button
      type="button"
      className="head-nav-hud__casual-dev-rollout"
      onClick={openRolloutReplayDev}
      aria-label="Rollout replay (dev)"
    >
      Rollout
    </button>
  ) : null;

  const victoryAnimLabEntry =
    showVictoryAnimLabEntry ? (
    <button
      type="button"
      className="head-nav-hud__casual-dev-rollout"
      onClick={openVictoryAnimLabDev}
      aria-label="Victory anim lab (dev)"
      title="Solitaire victory animation lab"
    >
      WinAnim
    </button>
  ) : null;

  const battlePassEntry = (
    <button
      type="button"
      className="head-nav-hud__casual-pass"
      onClick={openBattlePass}
      aria-label="打开赛季通行证"
    >
      <span className="head-nav-hud__casual-pass-accent" aria-hidden>
        <span className="head-nav-hud__casual-pass-accent__a" />
        <span className="head-nav-hud__casual-pass-accent__b" />
        <span className="head-nav-hud__casual-pass-accent__c" />
      </span>
      <span className="head-nav-hud__casual-pass-text">通行证</span>
    </button>
  );

  const leftCluster = (
    <div className="head-nav-hud__left">
      {user?.uid ? (
        <>
          <button
            type="button"
            className="head-nav-hud__casual-avatarTap"
            onClick={openPlayerProfile}
            aria-label="个人资料"
            aria-haspopup="dialog"
            aria-controls="casual_player_profile"
          >
            <div className="head-nav-hud__avatar" aria-hidden>
              <div className="head-nav-hud__avatar-pic">
                <img
                  className="head-nav-hud__avatar-fimg"
                  src={resolvedAvatar}
                  alt=""
                  draggable={false}
                />
              </div>
              <span className="head-nav-hud__level" aria-hidden>
                {level}
              </span>
            </div>
          </button>
        </>
      ) : (
        <div className="head-nav-hud__guest">
          <button
            type="button"
            className="head-nav-hud__signin"
            onClick={signIn}
            aria-label="Sign in"
          >
            <img
              className="head-nav-hud__signin-ico"
              src={HEAD_NAV_DESKTOP_ICON_AUTH_SIGNIN}
              alt=""
              draggable={false}
            />
            <span>Sign in</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <nav
      className={
        isPortraitHud
          ? "head-nav-hud head-nav-hud--portrait head-nav-hud--casual"
          : "head-nav-hud head-nav-hud--casual"
      }
      aria-label="Lobby top HUD"
    >
      {isPortraitHud ? (
        <>
          <div className="head-nav-hud__lead">
            {leftCluster}
            {currencyHud}
          </div>
          {stretch}
          {rolloutReplayDevEntry}
          {victoryAnimLabEntry}
          {battlePassEntry}
          <button
            ref={menuBtnRef}
            type="button"
            className="head-nav-hud__menubtn"
            aria-label="Menu"
            aria-expanded={menuPortalOpen && menuSlideIn}
            aria-haspopup="menu"
            onClick={onMenuBtnClick}
          >
            <HeadNavMenuGlyph />
          </button>
          <HeadNavPortraitMenuPortal
            open={menuPortalOpen}
            slideIn={menuSlideIn}
            anchorRect={menuAnchorRect}
            onPanelTransitionEnd={onMenuPanelTransitionEnd}
            onBackdropPointerDown={closeMenuAfterExit}
            onItemPick={onPortraitMenuItem}
          />
        </>
      ) : (
        <>
          {leftCluster}
          {currencyHud}
          {stretch}
          {rolloutReplayDevEntry}
          {victoryAnimLabEntry}
          {battlePassEntry}
        </>
      )}
    </nav>
  );
};
