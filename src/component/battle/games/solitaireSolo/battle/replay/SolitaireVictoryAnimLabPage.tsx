import gsap from "gsap";
import { ModalProp } from "host/service/ModalManager";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayEffects } from "../animation/PlayEffects";
import { victoryDeck } from "../testData/victoryDeck";
import type { SoloBoardDimension, SoloCard } from "../types/SoloTypes";
import { getCardCoord } from "../Utils";
import CardSVG from "../view/CardSVG";
import { popCard } from "../animation/effects/popCard";
import "../view/card.css";

type Mode = "sanity" | "cards";

function buildDim(width: number, height: number): SoloBoardDimension {
  const w = Math.max(360, width);
  const h = Math.max(420, height);
  const cardWidth = 64;
  const cardHeight = 96;
  const spacing = 10;
  const foundationY = 36;
  const foundationStartX = Math.floor(w * 0.3);
  const foundationColX = [0, 1, 2, 3].map(
    (i) => foundationStartX + i * (cardWidth + spacing)
  ) as [number, number, number, number];
  const tableauColX = [0, 1, 2, 3, 4, 5, 6].map(
    (i) => 24 + i * (cardWidth + spacing)
  ) as [number, number, number, number, number, number, number];
  return {
    left: 0,
    top: 0,
    width: w,
    height: h,
    cardWidth,
    cardHeight,
    spacing,
    foundationColX,
    tableauColX,
    zones: {
      talon: { x: 24, y: foundationY, width: cardWidth, height: cardHeight },
      waste: { x: 24 + cardWidth + spacing, y: foundationY, width: cardWidth * 2, height: cardHeight },
      foundations: {
        x: foundationStartX,
        y: foundationY,
        width: 4 * cardWidth + 3 * spacing,
        height: cardHeight,
      },
      tableau: {
        x: 24,
        y: foundationY + cardHeight + 24,
        width: w - 48,
        height: h * 0.5,
      },
    },
  };
}

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const SUIT_COLOR: Record<(typeof SUITS)[number], string> = {
  hearts: "#c62828",
  diamonds: "#ef6c00",
  clubs: "#2e7d32",
  spades: "#1565c0",
};

/**
 * 正确效果（Windows 纸牌风格）：
 * - 一次只飞 1 张（或几乎不重叠）
 * - 固定抛物线：抛起 → 落地 → 再弹 2 次 → 飞出右侧
 * - 能清楚跟上「这一张」在干什么
 *
 * 乱的感觉通常来自：多张同时弹、轨迹乱、3D 翻面闪烁。
 */
function playOneCardBounce(args: {
  el: HTMLElement;
  startX: number;
  startY: number;
  width: number;
  height: number;
  cardW: number;
  cardH: number;
  delay?: number;
  /** 真实牌面用 180（与局内明牌一致）；色块对照用 0 */
  faceRotateY?: number;
  dir?: 1 | -1;
  onComplete?: () => void;
}): gsap.core.Timeline {
  const {
    el,
    startX,
    startY,
    width,
    height,
    cardW,
    cardH,
    delay = 0,
    faceRotateY = 0,
    dir = 1,
    onComplete,
  } = args;
  const floorY = Math.min(height * 0.72, height - cardH - 16);
  const travel = dir > 0 ? Math.max(width - startX, cardW * 4) : Math.max(startX, cardW * 4);
  const step = Math.max(cardW * 1.35, travel / 5.5) * dir;
  const throwPeakY = startY - Math.min(170, Math.max(110, height * 0.26));
  let x = startX;
  let bounceH = Math.min(150, Math.max(90, (floorY - startY) * 0.35));

  gsap.killTweensOf(el);
  gsap.set(el, {
    x: startX,
    y: startY,
    opacity: 1,
    autoAlpha: 1,
    rotation: 0,
    scale: 1,
    rotateY: faceRotateY,
    zIndex: 5000,
    force3D: true,
  });
  if (faceRotateY === 180) {
    el.classList.add("card--flat-anim");
  }

  const tl = gsap.timeline({ delay, onComplete });
  const land1 = startX + step;

  tl.to(el, {
    x: startX + step * 0.38,
    y: throwPeakY,
    duration: 0.28,
    ease: "power2.out",
  }).to(el, {
    x: land1,
    y: floorY,
    duration: 0.32,
    ease: "power2.in",
  });
  x = land1;

  for (let b = 0; b < 2; b++) {
    const land = x + step * (0.85 - b * 0.12);
    const peak = x + (land - x) * 0.42;
    tl.to(el, {
      x: peak,
      y: floorY - bounceH,
      duration: 0.12,
      ease: "power1.out",
    }).to(el, {
      x: land,
      y: floorY,
      duration: 0.12,
      ease: "power1.in",
    });
    x = land;
    bounceH *= 0.55;
  }

  const exitX = dir > 0 ? width + cardW + 24 : -cardW - 24;
  tl.to(el, {
    x: exitX,
    y: floorY + 8,
    opacity: 0,
    duration: 0.28,
    ease: "power1.in",
  });

  return tl;
}

/** gapRatio≈0.92 一张一张；launchGap=0.32 活泼（空中约 2～3 张） */
function playCascade(args: {
  nodes: Array<{ el: HTMLElement; startX: number; startY: number; dir?: 1 | -1 }>;
  width: number;
  height: number;
  cardW: number;
  cardH: number;
  gapRatio?: number;
  launchGap?: number;
  faceRotateY?: number;
  onComplete?: () => void;
  onCardStart?: (index: number, total: number) => void;
}) {
  const {
    nodes,
    width,
    height,
    cardW,
    cardH,
    gapRatio,
    launchGap,
    faceRotateY = 0,
    onComplete,
    onCardStart,
  } = args;
  const master = gsap.timeline({ onComplete });
  let t = 0;
  nodes.forEach((node, i) => {
    onCardStart?.(i, nodes.length);
    const cardTL = playOneCardBounce({
      el: node.el,
      startX: node.startX,
      startY: node.startY,
      width,
      height,
      cardW,
      cardH,
      faceRotateY,
      dir: node.dir ?? 1,
    });
    master.add(cardTL, t);
    t += launchGap != null ? launchGap : cardTL.duration() * (gapRatio ?? 0.92);
  });
  master.play();
  return master;
}

/**
 * DEV Lab：先看「单张正确弹跳」，再看「一张一张 cascade」。
 * 若单张就看不懂/觉得乱 → 是轨迹设计问题；若单张清楚、多张乱 → 是重叠太多。
 */
const SolitaireVictoryAnimLabPage: React.FC<ModalProp> = () => {
  const boardRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef(buildDim(900, 640));
  const cardModelsRef = useRef<SoloCard[]>([]);
  const [mode, setMode] = useState<Mode>("cards");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("ready — 点「完整 52 张」：汇聚 → 打开扇子");
  const [dim, setDim] = useState(dimRef.current);
  const pendingFull52Ref = useRef(false);

  const sanityItems = useMemo(() => {
    const out: Array<{
      key: string;
      suit: (typeof SUITS)[number];
      lane: number;
      indexInLane: number;
      label: string;
      ref: React.RefObject<HTMLDivElement | null>;
    }> = [];
    // 每花色只要 3 张，Lab 更易读
    const ranks = ["K", "Q", "J"];
    SUITS.forEach((suit, lane) => {
      ranks.forEach((rank, indexInLane) => {
        out.push({
          key: `${suit}-${rank}`,
          suit,
          lane,
          indexInLane,
          label: `${rank}${suit[0]!.toUpperCase()}`,
          ref: React.createRef<HTMLDivElement>(),
        });
      });
    });
    return out;
  }, []);

  const cardModels = useMemo(() => {
    const cloned = victoryDeck.map((c) => ({ ...c, ele: null as HTMLDivElement | null }));
    cardModelsRef.current = cloned;
    return cloned;
  }, []);

  useEffect(() => {
    cardModelsRef.current = cardModels;
  }, [cardModels]);

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return dimRef.current;
    const r = board.getBoundingClientRect();
    const next = buildDim(r.width || 900, r.height || 640);
    dimRef.current = next;
    setDim(next);
    return next;
  }, []);

  const floorY = Math.min(dim.height * 0.72, dim.height - dim.cardHeight - 16);

  const layoutSanity = useCallback(() => {
    const d = measure();
    sanityItems.forEach((item) => {
      if (!item.ref.current) return;
      gsap.killTweensOf(item.ref.current);
      gsap.set(item.ref.current, {
        x: d.foundationColX[item.lane],
        y: d.zones.foundations.y,
        width: d.cardWidth,
        height: d.cardHeight,
        opacity: 1,
        rotation: 0,
        zIndex: 10 + item.indexInLane,
      });
    });
    setLog(`layout · ${sanityItems.length} blocks`);
  }, [measure, sanityItems]);

  const layoutCards = useCallback(() => {
    const d = measure();
    const board = boardRef.current;
    let n = 0;
    for (const card of cardModelsRef.current) {
      const el =
        (card.ele?.isConnected ? card.ele : null) ||
        (board?.querySelector(`[data-card-id="${card.id}"]`) as HTMLDivElement | null);
      if (!el) continue;
      card.ele = el;
      n++;
      gsap.killTweensOf(el);
      el.classList.add("card--flat-anim");
      const zoneCards = cardModelsRef.current.filter((c) => c.zoneId === card.zoneId);
      const { x, y } = getCardCoord(card, zoneCards, d);
      gsap.set(el, {
        x: Math.round(x),
        y: Math.round(y),
        width: d.cardWidth,
        height: d.cardHeight,
        opacity: 1,
        autoAlpha: 1,
        rotation: 0,
        rotateZ: 0,
        rotateY: 180,
        scale: 1,
        zIndex: 100 + (card.zoneIndex || 0),
        force3D: true,
      });
      popCard(card);
    }
    setLog(`layout · cards ele=${n}`);
  }, [measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (mode === "sanity") layoutSanity();
      else layoutCards();
    });
    return () => cancelAnimationFrame(id);
  }, [mode, layoutSanity, layoutCards]);

  const collectCardNodes = useCallback(() => {
    const d = dimRef.current;
    const nodes: Array<{ el: HTMLElement; startX: number; startY: number; dir: 1 | -1 }> = [];
    SUITS.forEach((suit, lane) => {
      const pile = cardModelsRef.current
        .filter((c) => c.zoneId === `foundation-${suit}` && c.ele)
        .sort((a, b) => b.zoneIndex - a.zoneIndex);
      const dir: 1 | -1 = lane % 2 === 0 ? 1 : -1;
      for (const c of pile) {
        nodes.push({
          el: c.ele!,
          startX: Number(gsap.getProperty(c.ele!, "x")) || d.foundationColX[lane],
          startY: Number(gsap.getProperty(c.ele!, "y")) || d.zones.foundations.y,
          dir,
        });
      }
    });
    return nodes;
  }, []);

  const collectSanityNodes = useCallback(() => {
    const d = dimRef.current;
    return sanityItems
      .slice()
      .sort((a, b) => (a.lane !== b.lane ? a.lane - b.lane : b.indexInLane - a.indexInLane))
      .map((item) => {
        const el = item.ref.current;
        if (!el) return null;
        return {
          el,
          startX: d.foundationColX[item.lane],
          startY: d.zones.foundations.y,
          dir: (item.lane % 2 === 0 ? 1 : -1) as 1 | -1,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [sanityItems]);

  /** 单张：正确效果的「标准答案」 */
  const playOneDemo = useCallback(() => {
    if (busy) return;
    if (mode === "sanity") layoutSanity();
    else layoutCards();
    const nodes = mode === "sanity" ? collectSanityNodes() : collectCardNodes();
    const first = nodes[0];
    if (!first) {
      setLog("no node");
      return;
    }
    nodes.slice(1).forEach((n) => gsap.set(n.el, { opacity: 0.15 }));
    const d = dimRef.current;
    setBusy(true);
    setLog("单张：抛起→弹跳→出场");
    playOneCardBounce({
      el: first.el,
      startX: first.startX,
      startY: first.startY,
      width: d.width,
      height: d.height,
      cardW: d.cardWidth,
      cardH: d.cardHeight,
      faceRotateY: mode === "cards" ? 180 : 0,
      dir: first.dir,
      onComplete: () => {
        setBusy(false);
        setLog("单张结束");
      },
    });
  }, [busy, mode, layoutSanity, layoutCards, collectSanityNodes, collectCardNodes]);

  /** 一张一张（对照，偏慢） */
  const playSequential = useCallback(() => {
    if (busy) return;
    if (mode === "sanity") layoutSanity();
    else layoutCards();
    const nodes = (mode === "sanity" ? collectSanityNodes() : collectCardNodes()).slice(0, 8);
    const d = dimRef.current;
    setBusy(true);
    setLog(`一张一张 · 0/${nodes.length}`);
    playCascade({
      nodes,
      width: d.width,
      height: d.height,
      cardW: d.cardWidth,
      cardH: d.cardHeight,
      gapRatio: 0.92,
      faceRotateY: mode === "cards" ? 180 : 0,
      onCardStart: (i, total) => setLog(`一张一张 · ${i + 1}/${total}`),
      onComplete: () => {
        setBusy(false);
        setLog("一张一张结束（对照用，局内不用这么慢）");
      },
    });
  }, [busy, mode, layoutSanity, layoutCards, collectSanityNodes, collectCardNodes]);

  /** 完整 52：走局内 PlayEffects（汇聚中心 → 扇形散开） */
  const runFull52 = useCallback(() => {
    layoutCards();
    const n = collectCardNodes().length;
    if (n === 0) {
      setLog("完整 52 · 无牌节点（ele=0）");
      setBusy(false);
      return;
    }
    setBusy(true);
    setLog(`扇子 · ${n} 张：汇聚 → 打开…`);
    PlayEffects.gameOver({
      effectType: "classicSimple",
      data: {
        cards: cardModelsRef.current,
        boardDimension: dimRef.current,
        gameState: { cards: cardModelsRef.current, zones: [] },
      },
      onComplete: () => {
        setBusy(false);
        setLog(`扇子 · ${n} 张结束`);
      },
    });
  }, [layoutCards, collectCardNodes]);

  const playLively = useCallback(() => {
    if (busy) return;
    if (mode !== "cards") {
      pendingFull52Ref.current = true;
      setBusy(true);
      setLog("切换到牌面…");
      setMode("cards");
      return;
    }
    runFull52();
  }, [busy, mode, runFull52]);

  useEffect(() => {
    if (mode !== "cards" || !pendingFull52Ref.current) return;
    pendingFull52Ref.current = false;
    const id = requestAnimationFrame(() => runFull52());
    return () => cancelAnimationFrame(id);
  }, [mode, runFull52]);

  const playLegacyEffect = useCallback(() => {
    if (busy) return;
    layoutCards();
    setBusy(true);
    setLog("扇子（局内同款）…");
    PlayEffects.gameOver({
      effectType: "classicSimple",
      data: {
        cards: cardModelsRef.current,
        boardDimension: dimRef.current,
        gameState: { cards: cardModelsRef.current, zones: [] },
      },
      onComplete: () => {
        setBusy(false);
        setLog("扇子结束");
      },
    });
  }, [busy, layoutCards]);

  const reset = useCallback(() => {
    if (mode === "sanity") layoutSanity();
    else layoutCards();
    setBusy(false);
    setLog("reset");
  }, [mode, layoutSanity, layoutCards]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 520,
        background: "#10241f",
        color: "#e8f5e9",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10, alignItems: "center" }}>
        <strong>Victory Lab</strong>
        <button type="button" disabled={busy} onClick={() => setMode("sanity")}>
          色块
        </button>
        <button type="button" disabled={busy} onClick={() => setMode("cards")}>
          牌面
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={playOneDemo}
          style={{ background: "#2e7d32", color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px" }}
        >
          ① 单张演示（先看这个）
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={playSequential}
          style={{ background: "#455a64", color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px" }}
        >
          ② 一张一张（对照）
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={playLively}
          style={{ background: "#1565c0", color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px" }}
        >
          ③ 完整 52 张（汇聚→扇子）
        </button>
        <button type="button" disabled={busy || mode !== "cards"} onClick={playLegacyEffect}>
          再播一次
        </button>
        <button type="button" disabled={busy} onClick={reset}>
          Reset
        </button>
        <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>{log}</span>
      </div>

      <div
        ref={boardRef}
        style={{
          position: "relative",
          flex: 1,
          margin: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.25)",
          overflow: "visible",
        }}
      >
        {/* 地面参考线：弹跳应落在这条线上 */}
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: floorY + dim.cardHeight,
            borderTop: "2px dashed rgba(255,255,255,0.35)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            top: floorY + dim.cardHeight + 4,
            fontSize: 11,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        >
          地面（牌应弹在这条线附近）
        </div>

        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: dim.foundationColX[i],
              top: dim.zones.foundations.y,
              width: dim.cardWidth,
              height: dim.cardHeight,
              border: "1px dashed rgba(255,255,255,0.25)",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />
        ))}

        {mode === "sanity"
          ? sanityItems.map((item) => (
              <div
                key={item.key}
                ref={item.ref}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  borderRadius: 8,
                  background: SUIT_COLOR[item.suit],
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                  willChange: "transform",
                }}
              >
                {item.label}
              </div>
            ))
          : cardModels.map((card) => (
              <div
                key={card.id}
                ref={(el) => {
                  card.ele = el;
                }}
                data-card-id={card.id}
                className="card card--flat-anim"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: dim.cardWidth,
                  height: dim.cardHeight,
                  willChange: "transform",
                }}
              >
                <CardSVG card={card} />
              </div>
            ))}
      </div>

      <div style={{ padding: "8px 12px 12px", fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
        <div>
          <b>局内同款：</b>四堆 → 叠到中心 → <b>像打开扇子</b>向上弧形展开 → 淡出。
        </div>
        <div>点 <b>③ 完整 52 张</b> 预览。</div>
      </div>
    </div>
  );
};

export default SolitaireVictoryAnimLabPage;
