import { LOBBY_CHROME_STRIP_HEIGHT_CSS } from "component/lobby/lobbyChromeStrip";
import { useSharedValue } from "host/service/SharedPageDataManager";
import { useUserManager } from "host/service/UserManager";
import React, { useLayoutEffect, useMemo, useRef } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { useCasualLobbySlideChildSwipe } from "../shared/useCasualLobbySlideChildSwipe";
import "./casualPageShell.css";

const FOOTER_FALLBACK_PX = 56;
/** 文档：底栏测量高度 + 少量呼吸区，再叠加 safe-area（在 CSS 中） */
const FOOTER_PAD_EXTRA = 8;

export interface CasualPageShellProps {
  /** Tab 标题，显示在顶栏左侧 */
  title: string;
  /** 用于 aria / 章节 id */
  titleId?: string;
  /** 默认 true；传 `false` 隐藏标题行。货币在休闲 HUD 顶栏（头像旁），不在此展示。 */
  showHeader?: boolean;
  /** 可选：顶栏标题右侧附加内容（默认无） */
  headerEnd?: React.ReactNode;
  /** 供横滑手势；挂在外层根节点 */
  rootRef?: React.RefObject<HTMLDivElement>;
  /** PageManager 传入的可见度，用于淡入 */
  visible?: number;
  /** 正文是否包一层 max-width 居中 */
  bodyMaxWidth?: boolean;
  children: React.ReactNode;
}

/**
 * 休闲大厅 Tab 通用骨架：Offline + Auth + Header + 唯一滚动 Body（底栏与安全区留白）。
 * 见 docs/casual-platform-lobby-bottom-nav-five-modules.md §10.0
 */
const CasualPageShell: React.FC<CasualPageShellProps> = ({
  title,
  titleId = "casual-page-title",
  showHeader = true,
  headerEnd,
  rootRef: rootRefProp,
  visible = 1,
  bodyMaxWidth = true,
  children,
}) => {
  const casual = useCasualPlatform();
  const { user, askAuth } = useUserManager();
  const footerDim = useSharedValue("casualLobby.footer.dimension");
  const localRef = useRef<HTMLDivElement>(null);
  const rootRef = rootRefProp ?? localRef;

  /** 是否挂手势由 hook 内 `!desktopNav || any-pointer:coarse` 决定，此处始终允许 */
  useCasualLobbySlideChildSwipe(rootRef, { enabled: true });

  const footerPad = useMemo(() => {
    const h = footerDim?.height;
    const base = typeof h === "number" && h > 0 ? h : FOOTER_FALLBACK_PX;
    return Math.round(base + FOOTER_PAD_EXTRA);
  }, [footerDim?.height]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--casual-shell-footer-pad", `${footerPad}px`);
  }, [footerPad, rootRef]);

  const offline = !casual.convexUrl;
  const authed = Boolean(user?.uid);
  const showShellHeader = showHeader !== false;

  return (
    <div ref={rootRef} className="casual-page-shell-root" style={{ opacity: visible > 0 ? 1 : 0 }}>
      <div className="casual-page-shell">
        {offline ? (
          <div className="casual-page-shell__offline" role="status">
            未配置休闲后端：请在环境变量中设置 <code>VITE_CONVEX_URL_CASUAL</code>
            。仍可浏览界面，部分操作不可用。
          </div>
        ) : null}

        {!authed ? (
          <div className="casual-page-shell__auth">
            <p>登录后可同步赛季进度、任务与通行证。</p>
            <button type="button" onClick={() => askAuth({})}>
              登录同步
            </button>
          </div>
        ) : null}

        {showShellHeader ? (
          <header
            className="casual-page-shell__header"
            aria-labelledby={titleId}
            style={{
              height: LOBBY_CHROME_STRIP_HEIGHT_CSS,
              minHeight: LOBBY_CHROME_STRIP_HEIGHT_CSS,
              boxSizing: "border-box",
            }}
          >
            <h1 id={titleId} className="casual-page-shell__title">
              {title}
            </h1>
            {headerEnd ?? null}
          </header>
        ) : null}

        <main
          className="casual-page-shell__body"
          role="main"
          aria-label={title}
          style={{
            paddingTop: showShellHeader ? 12 : 16,
          }}
        >
          {bodyMaxWidth ? (
            <div className="casual-page-shell__bodyInner">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default CasualPageShell;
