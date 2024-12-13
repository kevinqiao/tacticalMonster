import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";

interface IProps {
  asset?: string;
  animation?: string;
  width: number;
  height: number;
}

const BASE_CELL_SIZE = {
  width: 100,
  height: 150
};

const SpineSprite = ({ asset, animation, width, height }: IProps) => {
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
    view.style.backgroundColor = 'red';
    view.style.top = '0';
    view.style.left = '0';

    if (canvasRef.current) {
      canvasRef.current.appendChild(view);
    }

    const container = new PIXI.Container();
    containerRef.current = container;
    container.position.set(width / 2, height / 2);
    app.stage.addChild(container);

    return () => {
      app.destroy(true, {
        children: true,
        texture: false,
        baseTexture: false
      });
    };
  }, [width, height]);

  useEffect(() => {
    const app = appRef.current;
    const container = containerRef.current;

    if (!app || !container || !spineResources) return;

    try {
      const spine = new Spine(spineResources.spineData.spineData);
      spineRef.current = spine;

      spine.visible = true;
      spine.alpha = 1;
      spine.zIndex = 1;
      spine.scale.set(0.2);
      spine.position.set(0, 0);
      spine.pivot.set(BASE_CELL_SIZE.width / 2, BASE_CELL_SIZE.height);
      spine.state.setAnimation(0, "stand", true);

      container.addChild(spine);

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
