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
    move() {

        const action = this.actions['move'];
        if (!action) return;
        this.mixer.stopAllAction();
        const clip = action.getClip();
        const newAction = this.mixer.clipAction(clip);
        newAction.reset();
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.play();
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
        const action = this.actions['stand'];
        if (!action) return;
        this.mixer.stopAllAction();
        const clip = action.getClip();
        const newAction = this.mixer.clipAction(clip);
        newAction.reset();
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.play();
    }
}

