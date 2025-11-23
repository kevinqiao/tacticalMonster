/**
 * Character3DDemo - 3D角色展示演示组件
 * 用于展示和测试3D角色的各种功能和动画
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ModelConfig } from "../battle/config/modelConfig";
import { GameCharacter } from "../battle/types/CombatTypes";
import Character3D from "../battle/view/Character3D";
import "./Character3DDemo.css";
import { mockCharacters } from "./mockCharacterData";
import ModelConfigEditor from "./ModelConfigEditor";

type AnimationType = 'stand' | 'move' | 'attack';

const Character3DDemo: React.FC = () => {
    const [selectedCharacter, setSelectedCharacter] = useState<GameCharacter>(mockCharacters[0]);
    const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('stand');
    const [rotation, setRotation] = useState<number>(0);
    const [scale, setScale] = useState<number>(1);
    const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
    const [showInfo, setShowInfo] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showEditor, setShowEditor] = useState<boolean>(false);
    const [editorConfig, setEditorConfig] = useState<Partial<ModelConfig>>({});

    const view3DRef = useRef<HTMLDivElement>(null);
    const characterRef = useRef<GameCharacter>(selectedCharacter);
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const animatorRef = useRef<{ move: () => void; stand: () => void; attack?: () => void } | null>(null);

    // 更新角色引用
    useEffect(() => {
        characterRef.current = selectedCharacter;
    }, [selectedCharacter]);

    // 自动旋转
    useEffect(() => {
        if (isAutoRotate) {
            animationIntervalRef.current = setInterval(() => {
                setRotation(prev => (prev + 1) % 360);
            }, 50);
        } else {
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
            }
        }
        return () => {
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
            }
        };
    }, [isAutoRotate]);

    // 切换角色
    const handleCharacterChange = useCallback((character: GameCharacter) => {
        setIsLoading(true);
        animatorRef.current = null; // 清空animator引用，等待新模型加载
        setSelectedCharacter(character);
        setCurrentAnimation('stand');
        setRotation(0);
        setTimeout(() => setIsLoading(false), 500);
    }, []);

    // 切换动画
    const handleAnimationChange = useCallback((animation: AnimationType) => {
        setCurrentAnimation(animation);
        // 优先使用animatorRef中的animator
        const animator = animatorRef.current || characterRef.current?.animator;
        if (animator) {
            switch (animation) {
                case 'stand':
                    if (typeof animator.stand === 'function') {
                        animator.stand();
                    }
                    break;
                case 'move':
                    if (typeof animator.move === 'function') {
                        animator.move();
                    }
                    break;
                case 'attack':
                    if (typeof animator.attack === 'function') {
                        animator.attack();
                    }
                    break;
            }
        } else {
            console.warn('Animator不可用，无法播放动画:', animation);
        }
    }, []);

    // 重置所有参数
    const handleReset = useCallback(() => {
        setRotation(0);
        setScale(1);
        setIsAutoRotate(false);
        setCurrentAnimation('stand');
    }, []);

    // 计算视图区域尺寸
    const viewWidth = 400;
    const viewHeight = 400;

    return (
        <div className="character3d-demo">
            <div className="demo-header">
                <h2>3D 角色演示</h2>
                <button
                    className={`editor-toggle-btn ${showEditor ? 'active' : ''}`}
                    onClick={() => setShowEditor(!showEditor)}
                >
                    {showEditor ? '隐藏配置编辑器' : '显示配置编辑器'}
                </button>
            </div>

            <div className="demo-container">
                {/* 3D 视图区域 */}
                <div className="demo-view-area" ref={view3DRef}>
                    <div
                        className="demo-3d-container"
                        style={{
                            transform: `scale(${scale})`,
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.3s ease'
                        }}
                    >
                        <div
                            className="demo-3d-rotation-wrapper"
                            style={{
                                transform: `rotateY(${rotation}deg)`,
                                transformStyle: 'preserve-3d',
                                transition: isAutoRotate ? 'none' : 'transform 0.3s ease'
                            }}
                        >
                            <Character3D
                                character={selectedCharacter}
                                width={viewWidth}
                                height={viewHeight}
                                overrideConfig={showEditor ? editorConfig : undefined}
                                onAnimatorReady={(animator) => {
                                    animatorRef.current = animator;
                                    console.log('Character3DDemo: animator已就绪', animator);
                                }}
                            />
                        </div>
                    </div>

                    {isLoading && (
                        <div className="demo-loading">
                            <div className="loading-spinner"></div>
                            <p>加载中...</p>
                        </div>
                    )}
                </div>

                {/* 控制面板 */}
                <div className="demo-control-panel">
                    {/* 角色选择 */}
                    <div className="control-section">
                        <h3>角色选择</h3>
                        <div className="character-selector">
                            {mockCharacters.map((char) => (
                                <button
                                    key={char.character_id}
                                    className={`char-btn ${selectedCharacter.character_id === char.character_id ? 'active' : ''}`}
                                    onClick={() => handleCharacterChange(char)}
                                >
                                    {char.name || char.character_id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 动画控制 */}
                    <div className="control-section">
                        <h3>动画控制</h3>
                        <div className="animation-selector">
                            <button
                                className={`anim-btn ${currentAnimation === 'stand' ? 'active' : ''}`}
                                onClick={() => handleAnimationChange('stand')}
                            >
                                待机
                            </button>
                            <button
                                className={`anim-btn ${currentAnimation === 'move' ? 'active' : ''}`}
                                onClick={() => handleAnimationChange('move')}
                            >
                                移动
                            </button>
                            <button
                                className={`anim-btn ${currentAnimation === 'attack' ? 'active' : ''}`}
                                onClick={() => handleAnimationChange('attack')}
                            >
                                攻击
                            </button>
                        </div>
                    </div>

                    {/* 旋转控制 */}
                    <div className="control-section">
                        <h3>旋转控制</h3>
                        <div className="control-item">
                            <label>角度: {rotation}°</label>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                disabled={isAutoRotate}
                            />
                        </div>
                        <div className="control-item">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isAutoRotate}
                                    onChange={(e) => setIsAutoRotate(e.target.checked)}
                                />
                                自动旋转
                            </label>
                        </div>
                    </div>

                    {/* 缩放控制 */}
                    <div className="control-section">
                        <h3>缩放控制</h3>
                        <div className="control-item">
                            <label>缩放: {scale.toFixed(1)}x</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* 信息显示 */}
                    <div className="control-section">
                        <h3>
                            角色信息
                            <button
                                className="toggle-btn"
                                onClick={() => setShowInfo(!showInfo)}
                            >
                                {showInfo ? '隐藏' : '显示'}
                            </button>
                        </h3>
                        {showInfo && (
                            <div className="character-info">
                                <div className="info-item">
                                    <label>名称:</label>
                                    <span>{selectedCharacter.name || '未知'}</span>
                                </div>
                                <div className="info-item">
                                    <label>职业:</label>
                                    <span>{selectedCharacter.class || '未知'}</span>
                                </div>
                                <div className="info-item">
                                    <label>种族:</label>
                                    <span>{selectedCharacter.race || '未知'}</span>
                                </div>
                                <div className="info-item">
                                    <label>等级:</label>
                                    <span>{selectedCharacter.level}</span>
                                </div>
                                {selectedCharacter.stats && (
                                    <>
                                        <div className="info-item">
                                            <label>生命值:</label>
                                            <span>
                                                {selectedCharacter.stats.hp?.current || 0} /
                                                {selectedCharacter.stats.hp?.max || 0}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <label>魔法值:</label>
                                            <span>
                                                {selectedCharacter.stats.mp?.current || 0} /
                                                {selectedCharacter.stats.mp?.max || 0}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <label>攻击力:</label>
                                            <span>{selectedCharacter.stats.attack || 0}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>防御力:</label>
                                            <span>{selectedCharacter.stats.defense || 0}</span>
                                        </div>
                                    </>
                                )}
                                <div className="info-item">
                                    <label>当前动画:</label>
                                    <span>{currentAnimation}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 重置按钮 */}
                    <div className="control-section">
                        <button className="reset-btn" onClick={handleReset}>
                            重置所有参数
                        </button>
                    </div>
                </div>
            </div>

            {/* 配置编辑器面板 */}
            {showEditor && (
                <ModelConfigEditor
                    modelPath={selectedCharacter.asset?.resource?.glb || selectedCharacter.asset?.resource?.fbx || ''}
                    currentConfig={editorConfig}
                    onConfigChange={setEditorConfig}
                    onClose={() => setShowEditor(false)}
                />
            )}
        </div>
    );
};

export default Character3DDemo;
