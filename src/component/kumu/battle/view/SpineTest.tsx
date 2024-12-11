import { hexToPixel } from "component/kumu/utils/hexUtil";
import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";

const SpineTest = () => {
  const { hexCell } = useCombatManager();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!canvasRef.current || hexCell.width === 0 || hexCell.height === 0) return;
    const { clientWidth, clientHeight } = canvasRef.current;
    
    const app = new PIXI.Application({
      width: clientWidth,
      height: clientHeight,
      backgroundAlpha: 0,
      backgroundColor: 0x000000,
      antialias: true
    });
    appRef.current = app;
    canvasRef.current.appendChild(app.view as unknown as Node);

    const container = new PIXI.Container();
    containerRef.current = container;
    container.position.set(0, 0);
    app.stage.addChild(container);

    (async () => {
      try {
        await PIXI.Assets.load('/assets/monster_cat/monster_cat.png');
        await PIXI.Assets.load('/assets/monster_cat/monster_cat.atlas');
        const spineData = await PIXI.Assets.load('/assets/monster_cat/monster_cat.json');

        const spine = new Spine(spineData.spineData);
        spineRef.current = spine;
        
        const bounds = spine.getBounds();
        const baseScale = (hexCell.width * 0.9) / bounds.width;

        spine.scale.set(baseScale);
        spine.pivot.set(bounds.width * baseScale / 2, bounds.height * baseScale / 2);

        const { x, y } = hexToPixel(4, 4, hexCell.width, hexCell.height);
        spine.position.set(
          x + hexCell.width/1.6,
          y + hexCell.height/1.2
        );

        spine.state.setAnimation(0, "stand", true);
        container.addChild(spine);

      } catch (error) {
        console.error('Failed to load spine:', error);
      }
    })();

    return () => {
      app.destroy(true, true);
    };
  }, [hexCell]);

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
};

export default SpineTest; 