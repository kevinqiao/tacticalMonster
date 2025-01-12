import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { ThreeDModelAnimator } from "../animation/model/ThreeDModelAnimator";
import { GameCharacter } from "../types/CombatTypes";


interface IProps {
  character: GameCharacter;
  width: number;
  height: number;
  isFacingRight?: boolean;
}


const Character3D = ({ character, width, height, isFacingRight = true }: IProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const modelRef = useRef<THREE.Group>();
  const animationFrameRef = useRef<number>();
  const mixerRef = useRef<THREE.AnimationMixer>();
  const clockRef = useRef(new THREE.Clock());
  const actionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});  // 存储所有动作
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number }>({ top: 0, left: 0, width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);


  // 初始化场景 - 只在组件挂载时执行一次
  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机 - 调整视角和距离
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // camera.position.set(0, 0, 6); // 调整相机位置
    // camera.lookAt(-0.5, 0.5, 0);  // 看向稍高的位置
    camera.position.set(0, 0, 4); // 调整相机位置
    camera.lookAt(0.8, -0.2, 0);  // 看向稍高的位置

    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp',    // 使用高精度
      powerPreference: 'high-performance'  // 优先使用高性能GPU
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
    renderer.setSize(width * 2, height * 2, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;  // 使用sRGB颜色空间
    renderer.toneMapping = THREE.ACESFilmicToneMapping;  // 使用电影级色调映射
    renderer.toneMappingExposure = 1.0;  // 调整曝光
    renderer.shadowMap.enabled = true;  // 启用阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 使用软阴影
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);  // 增加环境光强度
    scene.add(ambientLight);

    // 添加多个方向光以提供更好的照明
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
    frontLight.position.set(0, 2, 5);
    frontLight.castShadow = true;  // 启用阴影投射
    frontLight.shadow.mapSize.width = 1024;  // 增加阴影贴图分辨率
    frontLight.shadow.mapSize.height = 1024;
    scene.add(frontLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(0, 2, -5);
    scene.add(backLight);

    const leftLight = new THREE.DirectionalLight(0xffffff, 0.6);
    leftLight.position.set(-5, 2, 0);
    scene.add(leftLight);

    const rightLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rightLight.position.set(5, 2, 0);
    scene.add(rightLight);
    // scene.background = new THREE.Color("red");

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // 更新动画混合器
      if (mixerRef.current) {
        const delta = clockRef.current.getDelta();
        mixerRef.current.update(delta);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 清理
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []); // 空依赖数组，只在挂载时执行

  // 处理尺寸变化
  useEffect(() => {
    // if (!rendererRef.current || !cameraRef.current) return;
    // rendererRef.current.setSize(width, height, false);
    // cameraRef.current.aspect = width / height;
    // cameraRef.current.updateProjectionMatrix();
    const top = -width / 2
    const left = -height / 2
    setPosition({ top, left, width: width * 2, height: height * 2 });
  }, [width, height]);
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;
    rendererRef.current.setSize(position.width, position.height, false);
    cameraRef.current.aspect = position.width / position.height;
    cameraRef.current.updateProjectionMatrix();
  }, [position]);

  // 加载模型 - 当 modelPath 改变时执行
  useEffect(() => {
    if (!sceneRef.current) return;
    const modelPath = '/assets/3d/characters/wukong.fbx';
    const loader = new FBXLoader();
    loader.load(modelPath, (fbx) => {
      if (modelRef.current) {
        sceneRef.current?.remove(modelRef.current);
      }

      const mixer = new THREE.AnimationMixer(fbx);
      mixerRef.current = mixer;

      // 存储所有动画
      if (fbx.animations && fbx.animations.length) {
        console.log('Loading animations:', fbx.animations); // 详细的动画信息
        fbx.animations.forEach((clip, index) => {
          console.log(`Animation ${index}:`, clip.name, clip.duration);
          // const action = mixer.clipAction(clip);
          const action = mixer.clipAction(
            THREE.AnimationUtils.subclip(clip, 'idle', 300, 330, 30)
          );
          actionsRef.current["move"] = action;
          character.animator = new ThreeDModelAnimator(mixer, actionsRef.current);
        });
      } else {
        console.warn('No animations found in model!');
      }

      // const box = new THREE.Box3().setFromObject(fbx);
      // const size = box.getSize(new THREE.Vector3());
      // console.log(size)
      // const center = box.getCenter(new THREE.Vector3());
      // console.log(center)
      // // 计算缩放
      // const maxDim = Math.max(size.x, size.y, size.z);
      // const scale = 8 / maxDim;  // 调整缩放系数
      // fbx.scale.multiplyScalar(scale);

      // // 居中处理
      // fbx.position.set(
      //   -center.x * scale - 3.5,
      //   -center.y * scale + 0.8,
      //   -center.z * scale
      // );

      let box = new THREE.Box3().setFromObject(fbx);
      let size = box.getSize(new THREE.Vector3());
      let center = box.getCenter(new THREE.Vector3());

      // 计算缩放
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDim;  // 调整缩放系数
      fbx.scale.multiplyScalar(scale);

      box = new THREE.Box3().setFromObject(fbx);
      size = box.getSize(new THREE.Vector3());
      center = box.getCenter(new THREE.Vector3());

      fbx.position.sub(center)
      // fbx.position.set(
      //   -center.x,
      //   -center.y,
      //   -center.z
      // );

      fbx.rotation.set(0, Math.PI, 0);

      modelRef.current = fbx;
      sceneRef.current?.add(fbx);
    });
  }, []);

  // 添加点击事件处理
  const handleClick = useCallback((event: React.MouseEvent) => {
    console.log('handleClick');
    const canvas = rendererRef.current?.domElement;
    if (!canvas || !modelRef.current || !cameraRef.current || !sceneRef.current) return;

    // 获取鼠标点击位置
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 创建射线
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // 检测点击是否命中模型
    const intersects = raycaster.intersectObject(modelRef.current, true);
    console.log('Intersects:', intersects.length); // 调试信息

    if (intersects.length > 0) {
      if (!mixerRef.current) return;

      const action = actionsRef.current[0];
      if (!action) return;

      // 停止所有动画
      // mixerRef.current.stopAllAction();

      const clip = action.getClip();
      const newAction = mixerRef.current.clipAction(clip);
      // 重置动画状态
      newAction.reset();
      newAction.setLoop(THREE.LoopOnce, 1);
      newAction.play();

    }
  }, []);

  // 添加鼠标事件处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMouseXRef.current = event.clientX;
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current || !modelRef.current) return;

    const deltaX = event.clientX - previousMouseXRef.current;
    modelRef.current.rotation.y += deltaX * 0.01; // 调整旋转速度
    previousMouseXRef.current = event.clientX;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}  // 鼠标离开时也停止拖动
      style={{
        width: `${position.width}px`,
        height: `${position.height}px`,
        position: 'absolute',
        top: position.top + 'px',
        left: position.left + 'px',
        // border: '1px solid red',
        pointerEvents: 'auto',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab'  // 根据状态改变鼠标样式
      }}
    />
  );


};

export default Character3D;