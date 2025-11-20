/**
 * Tactical Monster Spine 模型动画器
 */

import { Spine } from "pixi-spine";
import { ModelAnimator } from "../../../types/CombatTypes";

export class SpineModelAnimator implements ModelAnimator {
    private skeleton: Spine;
    constructor(skeleton: Spine) {
        this.skeleton = skeleton;
    }
    move() {
        this.skeleton.state.setAnimation(0, "walk", true);
    }
    attack() {
        this.skeleton.state.setAnimation(0, "attack", true);
    }
    stand() {
        this.skeleton.state.setAnimation(0, "stand", true);
    }
}

