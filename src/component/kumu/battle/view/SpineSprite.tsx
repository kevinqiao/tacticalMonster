import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";

interface IProps {
  asset?: string;
  animation?: string;
  width: number;
  height: number;
  isFacingRight?: boolean;
}


const SpineSprite = ({ asset, animation, width, height, isFacingRight = true }: IProps) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const [spineResources, setSpineResources] = useState<{
    atlas: any;
    spineData: any;
  } | null>(null);

  useEffect(() => {
    (async () => {
      if (spineResources) return;
      try {
        const [atlas, spineData] = await Promise.all([
          PIXI.Assets.load('/assets/monster_cat/monster_cat.atlas'),
          PIXI.Assets.load('/assets/monster_cat/monster_cat.json')
        ]);

        if (!atlas || !spineData) {
          throw new Error('Failed to load spine resources');
        }
        setSpineResources({ atlas, spineData });
      } catch (error) {
        console.error('Failed to load spine resources:', error);
        throw error;
      }
    })();
  }, []);

  useEffect(() => {
    if (appRef.current || width === 0 || height === 0) return;

    const app = new PIXI.Application({
      width: width,
      height: height,
      backgroundAlpha: 0,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    appRef.current = app;

    const view = app.view as HTMLCanvasElement;
    view.style.width = '100%';
    view.style.height = '100%';
    view.style.position = 'absolute';
    // view.style.backgroundColor = 'red';
    view.style.top = '0';
    view.style.left = '0';

    if (canvasRef.current) {
      canvasRef.current.appendChild(view);
    }

    const container = new PIXI.Container();
    containerRef.current = container;
    container.position.set(width / 2, height / 2);
    app.stage.addChild(container);


  }, [width, height]);

  useEffect(() => {
    const app = appRef.current;
    const container = containerRef.current;

    if (!app || !container || !spineResources) return;

    try {
      const parent = canvasRef.current;
      if (!parent) return;
      const { offsetWidth, offsetHeight } = parent;
      const spine = new Spine(spineResources.spineData.spineData);
      spineRef.current = spine;
      const bounds = spine.getBounds();
      console.log(bounds);
      spine.visible = true;
      spine.alpha = 1;
      spine.zIndex = 1;

      // 2. 计算合适的缩放比例
      const scale = Math.min(
        offsetWidth / bounds.width,
        offsetHeight / bounds.height
      );

      spine.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      const x = offsetWidth / 2;
      const y = offsetHeight / 2;
      spine.scale.set(scale, scale);
      spine.scale.x = isFacingRight ? Math.abs(spine.scale.x) : -Math.abs(spine.scale.x);
      spine.rotation = 0;
      spine.position.set(x, y);
      spine.state.setAnimation(0, "walk", true);

      app.stage.addChild(spine);

    } catch (error) {
      console.error(`Failed to create spine:`, error);
    }

    return () => {
      if (spineRef.current) {
        spineRef.current.destroy();
      }
    };
  }, [spineResources]);

  return <div ref={canvasRef} style={{ width: width, height: height }} />;
};

export default SpineSprite;
