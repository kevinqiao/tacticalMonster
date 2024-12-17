import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";
import { CharacterUnit } from "../model/CombatModels";

interface IProps {
  character: CharacterUnit;
  width: number;
  height: number;
  isFacingRight?: boolean;
}


const CharacterSpine = ({ character, width, height, isFacingRight = true }: IProps) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
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
    // console.log(width, height);
    // console.log(canvasRef.current?.offsetWidth, canvasRef.current?.offsetHeight);
    const app = new PIXI.Application({
      width: width,
      height: height,
      backgroundAlpha: 0,
      backgroundColor: "transparent",
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    appRef.current = app;

    const view = app.view as HTMLCanvasElement;
    view.style.width = '100%';
    view.style.height = '100%';
    view.style.position = 'absolute';
    view.style.backgroundColor = 'transparent';
    view.style.top = '0';
    view.style.left = '0';

    if (canvasRef.current) {
      canvasRef.current.appendChild(view);
    }


  }, [width, height]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !spineResources) return;

    try {
      const parent = canvasRef.current;
      if (!parent) return;
      const { offsetWidth, offsetHeight } = parent;
      const spine = new Spine(spineResources.spineData.spineData);
      spineRef.current = spine;
      character.skeleton = spine;
      const bounds = spine.getBounds();
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
      spine.scale.set(scale * 0.9, scale * 0.9);
      spine.scale.x = isFacingRight ? Math.abs(spine.scale.x) : -Math.abs(spine.scale.x);
      spine.rotation = 0;
      spine.position.set(x, y);
      spine.state.setAnimation(0, "stand", true);

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

  return <div ref={canvasRef} style={{ width: width, height: height, backgroundColor: "transparent" }} />;
};

export default CharacterSpine;
