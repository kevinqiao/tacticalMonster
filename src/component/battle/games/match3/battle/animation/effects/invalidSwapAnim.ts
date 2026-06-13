import gsap from 'gsap';

import { MATCH3_ANIMATION_CONFIG } from '../animationConfig';
import type { GridCellRefs } from '../gridCellRefs';

const { duration } = MATCH3_ANIMATION_CONFIG;

/** 无效交换：两格从交换位回到原位（不做整盘抖动） */
export function playInvalidSwapRevert(args: {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  refs: GridCellRefs;
  startOffsetX: number;
  startOffsetY: number;
}): Promise<void> {
  const el1 = args.refs[args.r1]?.[args.c1];
  const el2 = args.refs[args.r2]?.[args.c2];
  if (!el1 || !el2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gsap.killTweensOf([el1, el2]);
    gsap.set(el1, { x: args.startOffsetX, y: args.startOffsetY, scale: 1 });
    gsap.set(el2, { x: -args.startOffsetX, y: -args.startOffsetY, scale: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([el1, el2], { clearProps: 'transform' });
        resolve();
      },
    });
    tl.to(
      el1,
      {
        x: 0,
        y: 0,
        duration: duration.invalidRevert,
        ease: 'power2.out',
      },
      0
    );
    tl.to(
      el2,
      {
        x: 0,
        y: 0,
        duration: duration.invalidRevert,
        ease: 'power2.out',
      },
      0
    );
  });
}
