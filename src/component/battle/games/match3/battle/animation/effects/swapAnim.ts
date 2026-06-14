import gsap from 'gsap';

import { MATCH3_ANIMATION_CONFIG } from '../animationConfig';
import type { GridCellRefs } from '../gridCellRefs';

const { duration } = MATCH3_ANIMATION_CONFIG;

/** 有效交换：两格 DOM 互换位置，动画结束后再提交 grid 数据。 */
export function playSwapAnim(args: {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  refs: GridCellRefs;
  cellStepPx: number;
}): Promise<void> {
  const el1 = args.refs[args.r1]?.[args.c1];
  const el2 = args.refs[args.r2]?.[args.c2];
  if (!el1 || !el2) {
    return Promise.resolve();
  }

  const dx = (args.c2 - args.c1) * args.cellStepPx;
  const dy = (args.r2 - args.r1) * args.cellStepPx;

  return new Promise((resolve) => {
    gsap.killTweensOf([el1, el2]);
    gsap.set([el1, el2], { clearProps: 'transform' });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([el1, el2], { clearProps: 'transform' });
        resolve();
      },
    });
    tl.to(
      el1,
      {
        x: dx,
        y: dy,
        duration: duration.swap,
        ease: 'power2.out',
      },
      0
    );
    tl.to(
      el2,
      {
        x: -dx,
        y: -dy,
        duration: duration.swap,
        ease: 'power2.out',
      },
      0
    );
  });
}
