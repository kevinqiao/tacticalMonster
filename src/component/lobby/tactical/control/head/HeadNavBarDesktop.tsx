import { useModalManager } from "host/service/ModalManager";
import { useSharedValue } from "host/service/SharedPageDataManager";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePageManager } from "host/service/PageManager";
import type { User } from "host/service/UserManager";
import { useUserManager } from "host/service/UserManager";
import avatarPlaceholderUrl from "./assets/avatar-placeholder.svg?url";
import "./HeadNavControl.css";
import {
  HEAD_NAV_DESKTOP_ICON_AUTH_SIGNIN,
  HEAD_NAV_DESKTOP_ICONS,
} from "./HeadNavDesktopConfig";
import { formatResourceAmount, HeadHudResourceChip } from "./HeadHudResourceChip";
import { HEAD_NAV_LABEL, HEAD_NAV_MENU_ITEMS, HEAD_NAV_URI } from "./HeadNavShared";

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

/** 汉堡菜单示意（竖屏下单键替代三快捷） */
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

const PORTRAIT_MENU_INDICES = [0, 1, 2, 3] as const;
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
  onItemPick: (item: { label: string, type: "page" | "modal", uri: string }) => void;
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
        {HEAD_NAV_MENU_ITEMS.map((item: { label: string, type: "page" | "modal", uri: string }) => (
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
        {/* {PORTRAIT_MENU_INDICES.map((i) => (
          <button
            key={HEAD_NAV_URI[i]}
            type="button"
            className="head-nav-hud__menu-item"
            role="menuitem"
            onClick={() => onItemPick(HEAD_NAV_URI[i])}
          >
            {HEAD_NAV_LABEL[i]}
          </button>
        ))} */}
      </div>
    </div>,
    document.body
  );
}

/**
 * 桌面：主城式顶栏 HUD（左玩家信息、中快捷、右资源），与参考主城的「顶栏+资源条」同构；完整还原需切图与经济数据接入。 */
export const HeadNavBarDesktop: React.FC = () => {
  const { openPage } = usePageManager();
  const { openModal } = useModalManager();
  const { user, askAuth } = useUserManager();
  const orientation = useSharedValue("lobby.layout.orientation");
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
      console.log("onPortraitMenuItem", item);
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

  const signIn = useCallback(() => {
    askAuth({});
  }, [askAuth]);

  const u: User | null = user?.uid ? (user as User) : null;
  const gold = u?.uid ? u.assets?.gold : undefined;
  const gemN = u?.uid
    ? (u.assets as { gem?: number; gems?: number } | undefined)?.gems ??
    (u.assets as { gem?: number } | undefined)?.gem
    : undefined;
  const photoUrl = useMemo(() => avatarPhotoUrlFromUser(u), [user]);
  /** 无远程头像时走打包内静态图，保证顶栏立即可见、满框可验 */
  const resolvedAvatar = useMemo(
    () => photoUrl || avatarPlaceholderUrl,
    [photoUrl]
  );

  const onAddResource = useCallback(() => {
    if (!user?.uid) {
      signIn();
      return;
    }
    openPage({ uri: HEAD_NAV_URI[2] });
  }, [user?.uid, openPage, signIn]);

  const level = useMemo(() => levelFromUser(u), [user]);
  const quick = useMemo(
    () =>
      [0, 1, 2].map((i) => ({
        i,
        uri: HEAD_NAV_URI[i],
        label: HEAD_NAV_LABEL[i],
        src: HEAD_NAV_DESKTOP_ICONS[i],
      })),
    []
  );

  const leftCluster = (
    <div className="head-nav-hud__left">
      {user?.uid ? (
        <>
          <div className="head-nav-hud__avatar" aria-hidden>
            <div className="head-nav-hud__avatar-pic">
              <img
                className="head-nav-hud__avatar-fimg"
                src={resolvedAvatar}
                alt=""
                draggable={false}
              />
            </div>
            <span className="head-nav-hud__level" aria-label={`Level ${level}`}>
              {level}
            </span>
          </div>

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

  const currenciesCluster = (
    <div className="head-nav-hud__currencies" aria-label="Currencies">
      <HeadHudResourceChip
        amountLabel={formatResourceAmount(
          user?.uid ? (gold as number | undefined) : undefined
        )}
        glyphSrc={HEAD_NAV_DESKTOP_ICONS[0]}
        onAdd={onAddResource}
        addAriaLabel="Open store for gold"
      />
      <HeadHudResourceChip
        amountLabel={formatResourceAmount(
          user?.uid ? (gemN as number | undefined) : undefined
        )}
        glyphSrc={HEAD_NAV_DESKTOP_ICONS[1]}
        onAdd={onAddResource}
        addAriaLabel="Open store for gems"
      />
    </div>
  );

  return (
    <nav
      className={
        isPortraitHud ? "head-nav-hud head-nav-hud--portrait" : "head-nav-hud"
      }
      aria-label="Lobby top HUD"
    >
      {isPortraitHud ? (
        <>
          <div className="head-nav-hud__lead">
            {leftCluster}
            {currenciesCluster}
          </div>
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
          {currenciesCluster}
          <ul className="head-nav-hud__quick" aria-label="Quick entries">
            {quick.map((q) => (
              <li key={q.uri} className="head-nav-hud__quick-item">
                <button
                  type="button"
                  className="head-nav-hud__qbtn"
                  aria-label={q.label}
                  onClick={() => openPage({ uri: q.uri })}
                >
                  <img
                    className="head-nav-hud__qico"
                    src={q.src}
                    alt=""
                    draggable={false}
                  />
                  <span className="head-nav-hud__qcaption">{q.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
};
