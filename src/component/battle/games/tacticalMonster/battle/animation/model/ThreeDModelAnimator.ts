/**
 * Tactical Monster 3D 模型动画器
 */

import * as THREE from "three";
import { ModelAnimator } from "../../../types/CombatTypes";

export class ThreeDModelAnimator implements ModelAnimator {
    private mixer: THREE.AnimationMixer;
    private actions: { [key: string]: THREE.AnimationAction };
    constructor(mixer: THREE.AnimationMixer, actions: { [key: string]: THREE.AnimationAction }) {
        this.mixer = mixer;
        this.actions = actions;
    }
    
    // 通用的动画播放方法，支持所有动作类型
    playAnimation(animationName: string): boolean {
        console.log(`ThreeDModelAnimator.playAnimation(${animationName}) 被调用`);
        console.log('可用动作:', Object.keys(this.actions));
        
        // 停止所有正在播放的动画
        this.mixer.stopAllAction();
        
        // 停止所有actions
        Object.entries(this.actions).forEach(([name, action]) => {
            if (action && name !== animationName) {
                action.stop();
                action.reset();
                action.setEffectiveWeight(0);
                action.enabled = false;
            }
        });
        
        // 再次确保停止所有action
        this.mixer.stopAllAction();
        
        // 查找对应的action
        const action = this.actions[animationName];
        if (!action) {
            console.warn(`动画 ${animationName} 不存在，可用动作:`, Object.keys(this.actions));
            return false;
        }
        
        // 停止并重置action
        if (action.isRunning()) {
            action.stop();
        }
        action.reset();
        
        // 最后一次确保mixer中所有action都被停止
        this.mixer.stopAllAction();
        
        // 启用并播放action
        action.enabled = true;
        action.setEffectiveWeight(1);
        action.setLoop(THREE.LoopRepeat);
        action.play();
        
        console.log(`✓ 播放动画: ${animationName}`);
        return true;
    }
    move() {
        console.log('ThreeDModelAnimator.move() 被调用');
        console.log('尝试播放移动动画，可用动作:', Object.keys(this.actions));
        console.log('this.actions的内容:', this.actions);
        
        // 停止所有正在播放的动画
        this.mixer.stopAllAction();
        
        // 遍历所有actions（除了move），确保它们都被停止和重置
        Object.entries(this.actions).forEach(([name, action]) => {
            if (action && name !== 'move') {
                action.stop();  // 停止播放
                action.reset();  // 重置到开始状态
                action.setEffectiveWeight(0);  // 设置权重为0
                action.enabled = false;  // 禁用action
            }
        });
        
        // 再次调用stopAllAction确保完全停止
        this.mixer.stopAllAction();
        
        // 尝试多种可能的动画名称，直接从this.actions中获取
        const possibleNames = ['move', 'walk', 'run', 'walking', 'running', 'locomotion'];
        let action: THREE.AnimationAction | null = null;
        let actionName = '';
        
        console.log('查找move action，可用actions:', Object.keys(this.actions));
        console.log('尝试的动画名称:', possibleNames);
        
        // 直接从this.actions中查找move action
        for (const name of possibleNames) {
            if (this.actions[name]) {
                action = this.actions[name];
                actionName = name;
                console.log(`✓ 找到${name} action:`, action);
                break;
            } else {
                console.log(`  - ${name}不存在`);
            }
        }
        
        // 如果没找到标准名称，尝试查找任何包含"root"或其他可能表示移动的动画
        if (!action) {
            const keys = Object.keys(this.actions);
            // FBX格式动画通常包含"root"，但需要区分move和stand
            // 优先查找可能表示移动的root动画（通常名称不同或可以通过其他方式区分）
            const rootKeys = keys.filter(key => {
                const lower = key.toLowerCase();
                return key.includes('root') && !lower.includes('chain') && 
                       !lower.includes('idle') && !lower.includes('stand') && !lower.includes('wait');
            });
            if (rootKeys.length > 0) {
                // 如果有多个root动画，优先使用不是stand的那个
                const moveRootKey = rootKeys.find(key => {
                    const lower = key.toLowerCase();
                    return !lower.includes('stand') && !lower.includes('idle');
                }) || rootKeys[0];
                action = this.actions[moveRootKey];
                actionName = moveRootKey;
                console.log('使用root动画作为move:', actionName);
            } else {
                // 如果没找到root，尝试第一个非idle/stand的动画
                const nonIdleKeys = keys.filter(key => {
                    const lower = key.toLowerCase();
                    return !lower.includes('idle') && !lower.includes('stand') && !lower.includes('wait') && !lower.includes('chain');
                });
                if (nonIdleKeys.length > 0) {
                    action = this.actions[nonIdleKeys[0]];
                    actionName = nonIdleKeys[0];
                    console.log('使用备用动画作为move:', actionName);
                }
            }
        }
        
        if (!action) {
            console.warn('Move动画不存在，可用动画:', Object.keys(this.actions));
            // 即使没有move动画，也保持停止状态
            return;
        }
        
        // 直接使用已存在的action，确保正确播放
        const clip = action.getClip();
        const clipName = clip.name;
        
        // 重要：检查是否有其他action使用同一个clip，如果有，确保它们被停止
        // 这解决了当多个标准名称（如stand和move）映射到同一个clip时的问题
        Object.entries(this.actions).forEach(([key, otherAction]) => {
            if (otherAction && otherAction !== action && otherAction.getClip().name === clipName) {
                console.log(`停止使用同一个clip "${clipName}" 的其他action: ${key}`);
                if (otherAction.isRunning()) {
                    otherAction.stop();
                }
                otherAction.reset();
                otherAction.setEffectiveWeight(0);
                otherAction.enabled = false;
            }
        });
        
        // 重置action状态
        action.reset();
        action.enabled = true;  // 先启用action
        action.setEffectiveWeight(1.0); // 设置权重为1
        action.setLoop(THREE.LoopRepeat); // 移动动画应该循环播放
        
        // 确保action在mixer中
        if (!action.isRunning()) {
            action.play();
        }
        
        // 添加淡入效果，使过渡更平滑
        action.fadeIn(0.2);
        
        // 验证action是否在运行
        setTimeout(() => {
            console.log('验证move action状态:', {
                isRunning: action.isRunning(),
                enabled: action.enabled,
                weight: action.getEffectiveWeight(),
                clipName: action.getClip().name
            });
        }, 100);
        
        console.log('✓ 播放移动动画:', clip.name, '(原始名称:', actionName, ')', {
            isRunning: action.isRunning(),
            enabled: action.enabled,
            weight: action.getEffectiveWeight()
        });
    }
    attack() {
        const action = this.actions['attack'];
        if (!action) return;
        this.mixer.stopAllAction();
        const clip = action.getClip();
        const newAction = this.mixer.clipAction(clip);
        newAction.reset();
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.play();
    }
    stand() {
        console.log('尝试播放待机动画，可用动作:', Object.keys(this.actions));
        
        // 关键修复：多次停止所有 actions，确保完全停止
        // 先停止 mixer 中的所有 action（这会停止所有 action，包括未注册的）
        for (let i = 0; i < 5; i++) {
            this.mixer.stopAllAction();
            
            // 停止所有注册的 actions
            Object.values(this.actions).forEach(action => {
                if (action) {
                    if (action.isRunning()) {
                        action.stop();
                    }
                    action.reset();
                    action.setEffectiveWeight(0);
                    action.enabled = false;
                }
            });
        }
        
        // 最后再次确保 mixer 中所有 action 都被停止
        this.mixer.stopAllAction();
        
        // 验证：检查是否还有 action 在运行
        const runningActions = Object.values(this.actions).filter(action => action && action.isRunning());
        if (runningActions.length > 0) {
            console.warn('仍有动画在运行:', runningActions.map(a => a?.getClip()?.name));
            // 强制停止
            runningActions.forEach(action => {
                action?.stop();
                action?.reset();
                action?.setEffectiveWeight(0);
                action.enabled = false;
            });
            this.mixer.stopAllAction();
        }
        
        console.log('所有动画已停止（包括mixer中所有action），准备播放待机动画');
        
        // 尝试多种可能的动画名称
        const possibleNames = ['stand', 'idle', 'Idle', 'IDLE', 'idle_loop', 'stand_idle', 'wait', 'waiting'];
        let action = null;
        let actionName = '';
        
        for (const name of possibleNames) {
            if (this.actions[name]) {
                action = this.actions[name];
                actionName = name;
                break;
            }
        }
        
        // 如果没找到标准名称，尝试查找包含stand/idle的root动画
        if (!action) {
            const keys = Object.keys(this.actions);
            // 优先查找包含stand/idle的root动画
            const idleRootKeys = keys.filter(key => {
                const lower = key.toLowerCase();
                return (key.includes('root') || lower.includes('idle') || lower.includes('stand')) && 
                       !lower.includes('chain') && !lower.includes('move') && !lower.includes('walk') && !lower.includes('run');
            });
            if (idleRootKeys.length > 0) {
                action = this.actions[idleRootKeys[0]];
                actionName = idleRootKeys[0];
                console.log('使用root/idle动画作为stand:', actionName);
            } else if (keys.length > 0) {
                // 如果所有动画都是root且无法区分，优先使用第一个（通常是stand/idle）
                // 但确保不使用move相关的
                const defaultKey = keys.find(key => {
                    const lower = key.toLowerCase();
                    return key.includes('root') && !lower.includes('move') && !lower.includes('walk') && !lower.includes('run') && !lower.includes('chain');
                }) || keys[0];
                action = this.actions[defaultKey];
                actionName = defaultKey;
                console.log('使用默认动画作为stand:', actionName);
            }
        }
        
        if (!action) {
            console.warn('Stand动画不存在，可用动画:', Object.keys(this.actions));
            // 保持停止状态
            return;
        }
        
        // 确保使用正确的action（可能是已经存在的action，需要重置）
        const clip = action.getClip();
        const clipName = clip.name;
        
        // 关键修复：当多个标准名称映射到同一个clip时，需要停止所有使用该clip的action
        // 方法：遍历mixer的所有action（通过访问mixer的内部状态）
        // 注意：Three.js的mixer可能没有直接的方法获取所有action，所以我们通过注册的actions来检查
        
        // 停止所有使用同一个clip的其他action
        Object.entries(this.actions).forEach(([key, otherAction]) => {
            if (otherAction && otherAction !== action && otherAction.getClip().name === clipName) {
                console.log(`停止使用同一个clip "${clipName}" 的其他action: ${key}`);
                if (otherAction.isRunning()) {
                    otherAction.stop();
                }
                otherAction.reset();
                otherAction.setEffectiveWeight(0);
                otherAction.enabled = false;
            }
        });
        
        // 最后一次确保mixer中所有action都被停止（这会停止所有action，包括未注册的）
        this.mixer.stopAllAction();
        
        // 如果action已经存在，先完全停止和重置它
        if (action.isRunning()) {
            action.stop();
        }
        action.reset();  // 重置到开始状态
        
        // 关键：在播放之前，再次确保mixer中所有action都被停止
        // 这确保原始名称的action（如'Take 001'）也被停止
        this.mixer.stopAllAction();
        
        // 验证：在播放前检查是否有其他action在运行
        const allActionsBeforePlay = Object.values(this.actions).filter(a => a && a.isRunning());
        if (allActionsBeforePlay.length > 0) {
            console.warn('播放stand前仍有其他action在运行:', allActionsBeforePlay.map(a => a?.getClip()?.name));
            allActionsBeforePlay.forEach(a => {
                a?.stop();
                a?.reset();
                a?.setEffectiveWeight(0);
                a.enabled = false;
            });
            this.mixer.stopAllAction();
        }
        
        // 设置要播放的action
        action.setEffectiveWeight(1.0); // 设置权重为1
        action.enabled = true;  // 启用action
        action.setLoop(THREE.LoopRepeat); // 待机动画应该循环播放
        action.fadeIn(0.2); // 添加淡入效果
        action.play();
        
        // 验证：检查是否有其他action在运行（延迟检查，因为play()是异步的）
        setTimeout(() => {
            const allActionsAfterPlay = Object.values(this.actions).filter(a => a && a !== action && a.isRunning());
            if (allActionsAfterPlay.length > 0) {
                console.warn('播放stand后仍有其他action在运行:', allActionsAfterPlay.map(a => a?.getClip()?.name));
                console.warn('当前stand action状态:', {
                    isRunning: action.isRunning(),
                    enabled: action.enabled,
                    weight: action.getEffectiveWeight(),
                    clipName: action.getClip().name
                });
            } else {
                console.log('✓ 验证：只有stand action在运行');
            }
        }, 100);
        
        console.log('✓ 播放待机动画:', clip.name, '(原始名称:', actionName, ')', {
            clipDuration: clip.duration,
            tracksCount: clip.tracks.length,
            actionWeight: action.getEffectiveWeight(),
            actionEnabled: action.enabled
        });
    }
}

