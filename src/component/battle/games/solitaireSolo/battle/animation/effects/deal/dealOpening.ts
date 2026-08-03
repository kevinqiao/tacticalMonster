import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";
import { getCardCoord } from "../../../Utils";
import { popCard } from "../popCard";

type TimelinesMap = { [k: string]: { timeline: GSAPTimeline; cards: SoloCard[] } };

/**
 * Short Klondike opening deal (~1.2s): cascade from talon, then flip tableau tops.
 * Prefer this over full fan/spiral for Portal / CrazyGames first open.
 */
export const dealOpening = ({
  timelines,
  data,
  onComplete,
}: {
  timelines?: TimelinesMap;
  data: any;
  onComplete?: () => void;
}) => {
  const { cards, gameState, boardDimensionRef, boardDimension: boardDimensionArg } =
    data;
  const boardDimension = boardDimensionRef?.current ?? boardDimensionArg;
  const liveCards: SoloCard[] = gameState?.cards ?? [];
  const patches: SoloCard[] = cards ?? [];

  const finish = () => {
    if (timelines) delete timelines.dealOpening;
    onComplete?.();
  };

  const tl = gsap.timeline({ onComplete: finish });
  if (timelines) {
    timelines.dealOpening = { timeline: tl, cards: patches };
  }
  if (!boardDimension || !liveCards.length || !patches.length) {
    finish();
    return;
  }

  const deckX = boardDimension.zones.talon.x;
  const deckY = boardDimension.zones.talon.y;
  const dimRef = boardDimensionRef ?? { current: boardDimension };

  const liveById = new Map<string, SoloCard>(liveCards.map((c) => [c.id, c]));

  const cardW = boardDimension.cardWidth;
  const cardH = boardDimension.cardHeight;

  // Park every live card on the talon first (stock + tableau) to avoid layout flash.
  // Cards default to opacity:0 in CSS — must set autoAlpha + size before motion is visible.
  for (const card of liveCards) {
    if (!card.ele?.isConnected) continue;
    gsap.set(card.ele, {
      x: deckX,
      y: deckY,
      width: cardW,
      height: cardH,
      rotateZ: 0,
      rotateY: 0,
      scale: 1,
      autoAlpha: 1,
      zIndex: 5,
      force3D: true,
    });
  }

  let tweenCount = 0;
  for (let col = 0; col < 7; col++) {
    const columnPatches = patches
      .filter(
        (c) =>
          (c.zone === ZoneType.TABLEAU ||
            String(c.zoneId ?? "").startsWith("tableau-")) &&
          c.zoneId === `tableau-${col}`
      )
      .sort((a, b) => a.zoneIndex - b.zoneIndex);

    columnPatches.forEach((patch, rowIndex) => {
      const card = liveById.get(patch.id);
      if (!card?.ele?.isConnected) return;
      const delay = col * 0.07 + rowIndex * 0.035;
      tweenCount += 1;
      tl.to(
        card.ele,
        {
          x: () => getCardCoord(patch, liveCards, dimRef).x,
          y: () => getCardCoord(patch, liveCards, dimRef).y,
          duration: 0.32,
          ease: "power2.out",
          zIndex: () => patch.zoneIndex + 10,
        },
        delay
      );
    });
  }

  const revealPatches = patches
    .filter((c) => c.isRevealed)
    .sort((a, b) => {
      const colA = Number(String(a.zoneId).split("-")[1] ?? 0);
      const colB = Number(String(b.zoneId).split("-")[1] ?? 0);
      return colA - colB;
    });

  tl.add("reveal", "+=0.1");
  revealPatches.forEach((patch, index) => {
    const card = liveById.get(patch.id);
    if (!card?.ele?.isConnected) return;
    popCard(card);
    tweenCount += 1;
    tl.to(
      card.ele,
      {
        rotateY: 180,
        duration: 0.26,
        ease: "power2.inOut",
      },
      `reveal+=${index * 0.07}`
    );
  });

  if (tweenCount === 0) {
    tl.kill();
    finish();
    return;
  }

  tl.play();
};
