import gsap from "gsap";
import { AudioBus } from "host/service/audio";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";
import { getCardCoord } from "../../../Utils";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;

function resolveEle(card: SoloCard, root?: ParentNode | null): HTMLElement | null {
  if (card.ele?.isConnected) return card.ele;
  const scope = root ?? document;
  const live = scope.querySelector(
    `.solo-board-cards-layer .card[data-card-id="${card.id}"], .card[data-card-id="${card.id}"]`
  ) as HTMLElement | null;
  if (live) {
    card.ele = live as HTMLDivElement;
    return live;
  }
  return null;
}

/**
 * 胜利动画：foundation → 叠到中心 → 像打开扇子一样弧形展开 → 淡出
 */
export const cascadeClassicSimple = ({
  data,
  onComplete,
}: {
  data: any;
  onComplete?: () => void;
}) => {
  const { cards, boardDimension } = data;
  const list = (cards as SoloCard[] | undefined) ?? [];
  const boardRoot =
    document.querySelector(".solo-board-cards-layer")?.parentElement ??
    document.querySelector(".solo-board-surface");

  const items = list
    .filter(
      (c) =>
        c.zone === ZoneType.FOUNDATION ||
        String(c.zoneId ?? "").startsWith("foundation-")
    )
    .map((card) => {
      const ele = resolveEle(card, boardRoot);
      return ele ? { card, ele } : null;
    })
    .filter((x): x is { card: SoloCard; ele: HTMLElement } => x != null);

  if (items.length === 0) {
    console.warn("[Solitaire] fan victory: 0 cards");
    AudioBus.emit("game.solitaire.win");
    onComplete?.();
    return;
  }

  const width = boardDimension?.width ?? 900;
  const height = boardDimension?.height ?? 640;
  const cardW = boardDimension?.cardWidth ?? 72;
  const cardH = boardDimension?.cardHeight ?? 108;

  // 汇聚落点（叠中心）
  const stackX = width / 2 - cardW / 2;
  const stackY = height / 2 - cardH / 2;

  // 扇子枢轴略靠下，扇面向上打开
  const pivotX = stackX;
  const pivotY = Math.min(height * 0.68, height - cardH * 0.35);
  const fanRadius = Math.min(width, height) * 0.4;
  const fanSpanDeg = 156; // 总张角
  const fanStartDeg = -fanSpanDeg / 2;

  const byZone = new Map<string, typeof items>();
  for (const it of items) {
    const id = it.card.zoneId || "foundation-hearts";
    const arr = byZone.get(id) ?? [];
    arr.push(it);
    byZone.set(id, arr);
  }
  for (const arr of byZone.values()) {
    arr.sort((a, b) => a.card.zoneIndex - b.card.zoneIndex);
  }

  for (const { card, ele } of items) {
    gsap.killTweensOf(ele);
    const zoneCards = (byZone.get(card.zoneId) ?? []).map((x) => x.card);
    let x = Number(gsap.getProperty(ele, "x")) || 0;
    let y = Number(gsap.getProperty(ele, "y")) || 0;
    if (boardDimension) {
      const c = getCardCoord(card, zoneCards, boardDimension);
      x = Math.round(c.x);
      y = Math.round(c.y);
    }
    gsap.set(ele, {
      autoAlpha: 1,
      x,
      y,
      width: cardW,
      height: cardH,
      scale: 1,
      rotation: 0,
      rotateZ: 0,
      rotateY: 180,
      zIndex: 200 + (card.zoneIndex || 0),
      force3D: true,
      transformOrigin: "50% 85%",
    });
    ele.classList.add("card--flat-anim");
  }

  // 顶牌先动汇聚
  const ordered: typeof items = [];
  SUITS.forEach((suit) => {
    const pile = (byZone.get(`foundation-${suit}`) ?? []).slice().reverse();
    ordered.push(...pile);
  });

  const n = ordered.length;
  const master = gsap.timeline({
    onComplete: () => onComplete?.(),
  });

  // —— 1) 汇聚：叠到中心 ——
  const gatherDur = 0.32;
  const gatherStagger = 0.02;
  ordered.forEach((item, i) => {
    gsap.set(item.ele, { zIndex: 3000 + i });
    // 跟拍：每张汇聚一小下（throttle 在 catalog）
    master.call(() => AudioBus.emit("game.solitaire.score_delta"), undefined, i * gatherStagger);
    master.to(
      item.ele,
      {
        x: stackX,
        y: stackY,
        rotation: 0,
        scale: 1,
        duration: gatherDur,
        ease: "power2.in",
      },
      i * gatherStagger
    );
  });

  const gatherEnd = (n - 1) * gatherStagger + gatherDur;
  // 等全部叠到中心后再开扇（局内若提前开扇，看起来像四堆各扇一下）
  const fanAt = gatherEnd + 0.06;
  master.call(() => AudioBus.emit("game.solitaire.win"), undefined, fanAt);

  // —— 2) 打开扇子：从中心向两侧展开 ——
  const openDur = 0.72;
  const mid = (n - 1) / 2;

  ordered.forEach((item, i) => {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const deg = fanStartDeg + t * fanSpanDeg;
    const rad = (deg * Math.PI) / 180;
    // 0° 朝上
    const tx = pivotX + Math.sin(rad) * fanRadius;
    const ty = pivotY - Math.cos(rad) * fanRadius;
    // 从中间往两边打开
    const delay = Math.abs(i - mid) * 0.014;
    const t0 = fanAt + delay;

    gsap.set(item.ele, { zIndex: 5000 + i });
    if (i % 4 === 0) {
      master.call(() => AudioBus.emit("game.solitaire.flip"), undefined, t0);
    }

    master.to(
      item.ele,
      {
        x: tx,
        y: ty,
        rotation: deg,
        scale: 1,
        duration: openDur,
        ease: "power2.out",
      },
      t0
    );
  });

  const fanOpenEnd = fanAt + mid * 0.014 + openDur;

  // —— 3) 扇面定格一瞬后整体淡出 ——
  const hold = 0.18;
  const fadeDur = 0.35;
  ordered.forEach((item, i) => {
    master.to(
      item.ele,
      {
        autoAlpha: 0,
        y: `+=${12 + (i % 5)}`,
        duration: fadeDur,
        ease: "power1.in",
      },
      fanOpenEnd + hold
    );
  });

  if (master.duration() < 0.05) {
    onComplete?.();
    return;
  }
  master.play();
};
