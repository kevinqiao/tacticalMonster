// src/components/SpineManager.jsx
import { gsap } from "gsap";
import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef } from "react";
import { calculatePerspective, calculateRotation, hexToPixel } from "../../utils/hexUtil";
import { useCombatManager } from "../service/CombatManager";

// Extend Spine type to include isMoving
declare module "pixi-spine" {
    interface Spine {
        isMoving?: boolean;
    }
}

const CharacterStage = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { characters, cellSize = 50, paths, setPaths, updateCharacterPosition } = useCombatManager();
  const spineCharactersRef = useRef<Record<string, Spine>>({});
  const graphicsRef = useRef<PIXI.Graphics | null>(null); // 用于绘制路径
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    // 初始化 Pixi.js 应用
    if (!canvasRef.current) return;
    const { clientWidth, clientHeight } = canvasRef.current;
    const app = new PIXI.Application({
      width: clientWidth,
      height: clientHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColor: 0x00000000, // 透明背景
    });
    appRef.current = app;

    if (canvasRef.current) {
      canvasRef.current.appendChild(app.view as unknown as Node);
    }

    // 创建 Graphics 对象用于绘制路径
    const graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);
    graphicsRef.current = graphics;

    // 清理 Pixi.js 应用
    return () => {
      app.destroy(true, true);
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !characters) return;

    // 添加新角色的 Spine 动画
    characters.forEach((character) => {
      if (!spineCharactersRef.current[character.character_id]) {
        (async () => {
          try {
            const spineData = await PIXI.Assets.load(character.asset); // 确保 asset 路径正确
            const spineCharacter = new Spine(spineData.spineData);

            const { x, y } = hexToPixel(character.q, character.r, cellSize);
            spineCharacter.position.set(x, y);
            spineCharacter.scale.set(0.5); // 根据需要调整

            app.stage.addChild(spineCharacter);
            spineCharacter.state.setAnimation(0, "idle", true); // 替换为实际动画名称

            spineCharactersRef.current[character.character_id] = spineCharacter;
          } catch (error) {
            console.error(`Failed to load Spine animation for character ${character.character_id}:`, error);
          }
        })();
      }
    });

    // 移除不再存在的角色
    Object.keys(spineCharactersRef.current).forEach((id) => {
      if (!characters.find((c) => c.character_id === id)) {
        const spineCharacter = spineCharactersRef.current[id];
        if (spineCharacter) {
          app.stage.removeChild(spineCharacter);
          spineCharacter.destroy();
          delete spineCharactersRef.current[id];
        }
      }
    });
  }, [characters, cellSize]);

  useEffect(() => {
    // 绘制路径
    const graphics = graphicsRef.current;
    if (!graphics) return;

    // 清除之前的绘制
    graphics.clear();

    Object.entries(paths).forEach(([characterId, path]) => {
      if (path.length > 0) {
        // Convert characterId to number for modulo operation
        const color = Number(characterId) % 2 === 0 ? 0x00ff00 : 0xff0000;
        graphics.lineStyle(4, color, 1);
        const startPixel = hexToPixel(path[0].q, path[0].r, cellSize);
        graphics.moveTo(startPixel.x, startPixel.y);

        for (let i = 1; i < path.length; i++) {
          const point = hexToPixel(path[i].q, path[i].r, cellSize);
          graphics.lineTo(point.x, point.y);
        }
      }
    });
  }, [paths, cellSize]);

  useEffect(() => {
    // 处理角色行走
    Object.entries(paths).forEach(([characterId, path]) => {
      if (path.length === 0) return;

      const spineCharacter = spineCharactersRef.current[characterId];
      if (!spineCharacter) return;

      // 如果已经在移动中，避免重复触发
      if (spineCharacter.isMoving) return;

      spineCharacter.isMoving = true;

      const moveAlongPath = async () => {
        // 切换到行走动画
        spineCharacter.state.setAnimation(0, "walk", true);

        for (let i = 1; i < path.length; i++) {
          const currentPos = hexToPixel(path[i - 1].q, path[i - 1].r, cellSize);
          const nextPos = hexToPixel(path[i].q, path[i].r, cellSize);

          // 计算旋转角度
          const rotation = calculateRotation(currentPos, nextPos);

          // 计算缩放和倾斜
          const { scale, skewX } = calculatePerspective(
            path[i].r,
            10, // maxDepth
            0.5, // baseScale
            1200, // perspective
            55 // rotateXAngle
          );

          // 使用 GSAP 动画平滑过渡位置、旋转、缩放和倾斜
          const movementTween = gsap.to(spineCharacter.position, {
            x: nextPos.x,
            y: nextPos.y,
            duration: 0.5,
            ease: "power1.inOut",
          });

          const rotationTween = gsap.to(spineCharacter, {
            rotation: rotation,
            duration: 0.5,
            ease: "power1.inOut",
          });

          const skewTween = gsap.to(spineCharacter.skew, {
            x: skewX,
            duration: 0.5,
            ease: "power1.inOut",
          });

          const scaleTween = gsap.to(spineCharacter.scale, {
            x: scale,
            y: scale,
            duration: 0.5,
            ease: "power1.inOut",
          });

          // 等待所有动画完成
          await Promise.all([movementTween, rotationTween, skewTween, scaleTween]);

          // 更新角色的位置在上下文中
          updateCharacterPosition(characterId, path[i].q, path[i].r);
        }

        // 行走完成，切换回待机动画
        spineCharacter.state.setAnimation(0, "idle", true);
        spineCharacter.isMoving = false;

        // 清空路径
        setPaths((prevPaths) => ({
          ...prevPaths,
          [characterId]: [],
        }));
      };

      moveAlongPath();
    });
  }, [paths, cellSize, setPaths, updateCharacterPosition]);

  // 监听窗口大小变化，调整 Pixi.js 应用尺寸
  useEffect(() => {
    const handleResize = () => {
      const app = appRef.current;
      if (!app || !characters) return;
      
      app.renderer.resize(window.innerWidth, window.innerHeight);

      // 根据新尺寸重新计算角色位置
      characters.forEach((character) => {
        const spineCharacter = spineCharactersRef.current[character.character_id];
        if (spineCharacter) {
          const { x, y } = hexToPixel(character.q, character.r, cellSize);
          gsap.to(spineCharacter.position, {
            x: x,
            y: y,
            duration: 0.5,
            ease: "power1.inOut",
          });
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [characters, cellSize]);

  return (
    <div
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // 允许击事件传递到底层
        zIndex: 10, // 确保 SpineManager 在最上层
        transform: "rotateX(55deg)", // 模拟 CSS 3D 透视效果
        transformOrigin: "center center",
      }}
    />
  );
};

export default CharacterStage;
