import gsap from 'gsap';

import { MATCH3_ANIMATION_CONFIG } from '../animationConfig';

const { duration, clear: clearCfg } = MATCH3_ANIMATION_CONFIG;

function clearGsapProps(els: HTMLElement[]) {
  if (els.length === 0) return;
  gsap.set(els, { clearProps: 'transform,opacity,filter,boxShadow' });
}

/** 消除：仅对传入 DOM 做高亮 + 缩小淡出（底格数据在动画结束后才提交） */
export function playClearAnim(refs: HTMLElement[]): Promise<void> {
  return new Promise((resolve) => {
    const unique = [...new Set(refs)];
    if (unique.length === 0) {
      resolve();
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        clearGsapProps(unique);
        resolve();
      },
    });
    tl.to(unique, {
      scale: 1.14,
      filter: 'brightness(1.4)',
      boxShadow: '0 0 12px rgba(255,255,255,0.85)',
      duration: duration.clearFlash,
      ease: 'power2.out',
      stagger: clearCfg.stagger,
    }).to(unique, {
      scale: 0,
      opacity: 0,
      filter: 'brightness(1.6)',
      boxShadow: 'none',
      duration: duration.clearVanish,
      ease: 'power3.in',
      stagger: clearCfg.stagger,
    });
  });
}

export type FallAnimMove = {
  el: HTMLElement;
  dx: number;
  dy: number;
};

/** 下落：仅移动 from 格 DOM */
export function playFallAnim(moves: FallAnimMove[]): Promise<void> {
  return new Promise((resolve) => {
    const valid = moves.filter((m) => m.el);
    if (valid.length === 0) {
      resolve();
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        clearGsapProps(valid.map((m) => m.el));
        resolve();
      },
    });
    for (const m of valid) {
      tl.to(
        m.el,
        {
          x: m.dx,
          y: m.dy,
          duration: duration.fall,
          ease: 'power2.out',
        },
        0
      );
    }
  });
}

export type SpawnAnimTarget = {
  el: HTMLElement;
  dropSteps: number;
};

/** 填充：仅 Y 轴落入（不碰 opacity/scale/filter，避免与消除特效混淆） */
export function primeSpawnDropOffsets(targets: SpawnAnimTarget[], cellStepPx: number): void {
  for (const t of targets) {
    if (!t.el) continue;
    gsap.set(t.el, { clearProps: 'opacity,scale,filter,boxShadow,x' });
    gsap.set(t.el, { y: -t.dropSteps * cellStepPx });
  }
}

export function playSpawnAnim(targets: SpawnAnimTarget[], cellStepPx: number): Promise<void> {
  return new Promise((resolve) => {
    const valid = targets.filter((t) => t.el);
    if (valid.length === 0) {
      resolve();
      return;
    }
    primeSpawnDropOffsets(valid, cellStepPx);
    const tl = gsap.timeline({
      onComplete: () => {
        if (valid.length > 0) {
          gsap.set(
            valid.map((t) => t.el),
            { clearProps: 'transform' }
          );
        }
        resolve();
      },
    });
    for (const t of valid) {
      tl.to(
        t.el,
        {
          y: 0,
          duration: duration.spawn,
          ease: 'power2.out',
        },
        0
      );
    }
  });
}
