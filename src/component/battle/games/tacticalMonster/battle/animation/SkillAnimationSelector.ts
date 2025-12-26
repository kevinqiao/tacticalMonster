/**
 * 技能动画选择器
 * 根据技能配置、映射表和效果类型选择适当的动画
 */

import { MonsterSkill, SkillEffect, SkillEffectType } from "../../../../../../convex/tacticalMonster/convex/data/skillConfigs";
import { SkillAnimation } from "../types/CharacterTypes";

export class SkillAnimationSelector {
    // 技能ID到动画配置的映射（优先级2）
    private skillAnimationMap: Record<string, SkillAnimation> = {
        "basic_attack": { name: "melee", target: "hurt" },
        "ranged_attack": { name: "ranged_attack", target: "hurt" },
        "heal": { name: "cast" },
        "group_heal": { name: "cast" },
        // 可以根据需要扩展更多技能
    };
    
    // 效果类型到动画的映射（优先级4）
    private effectTypeAnimationMap: Record<SkillEffectType, SkillAnimation> = {
        [SkillEffectType.DAMAGE]: { name: "melee", target: "hurt" },
        [SkillEffectType.HEAL]: { name: "cast" },
        [SkillEffectType.BUFF]: { name: "cast" },
        [SkillEffectType.DEBUFF]: { name: "cast" },
        [SkillEffectType.DOT]: { name: "cast" },
        [SkillEffectType.HOT]: { name: "cast" },
        [SkillEffectType.SHIELD]: { name: "cast" },
        [SkillEffectType.STUN]: { name: "cast" },
        [SkillEffectType.MP_RESTORE]: { name: "cast" },
        [SkillEffectType.MP_DRAIN]: { name: "cast" },
        [SkillEffectType.MOVEMENT]: { name: "cast" },
        [SkillEffectType.TELEPORT]: { name: "cast" },
    };
    
    /**
     * 获取施法者动画名称
     * 优先级：技能配置 > 映射表 > type提示 > 效果类型 > 默认
     */
    getCasterAnimation(skill: MonsterSkill): string {
        // 优先级1: 技能配置中的 animation.name
        if (skill.animation?.name) {
            return skill.animation.name;
        }
        
        // 优先级2: 技能ID映射表
        if (this.skillAnimationMap[skill.id]?.name) {
            return this.skillAnimationMap[skill.id].name!;
        }
        
        // 优先级3: animation.type 提示
        if (skill.animation?.type === "attack") {
            return "melee";
        }
        if (skill.animation?.type === "cast") {
            return "cast";
        }
        if (skill.animation?.type === "special") {
            return "cast";
        }
        
        // 优先级4: 根据主要效果类型
        const primaryEffect = this.getPrimaryEffect(skill);
        if (primaryEffect) {
            const effectAnimation = this.effectTypeAnimationMap[primaryEffect.type];
            if (effectAnimation?.name) {
                return effectAnimation.name;
            }
        }
        
        // 默认
        return "cast";
    }
    
    /**
     * 获取目标动画名称
     * 优先级：技能配置 > 映射表 > 效果类型推断 > null
     */
    getTargetAnimation(skill: MonsterSkill): string | null {
        // 优先级1: 技能配置中的 animation.target
        if (skill.animation?.target) {
            return skill.animation.target;
        }
        
        // 优先级2: 技能ID映射表
        if (this.skillAnimationMap[skill.id]?.target) {
            return this.skillAnimationMap[skill.id].target!;
        }
        
        // 优先级3: 根据效果类型自动推断
        if (this.hasEffectType(skill, SkillEffectType.DAMAGE)) {
            return "hurt";
        }
        
        // 其他效果不播放目标动画
        return null;
    }
    
    /**
     * 获取主要效果（优先返回DAMAGE效果，否则返回第一个效果）
     */
    private getPrimaryEffect(skill: MonsterSkill): SkillEffect | null {
        // 优先返回DAMAGE效果
        const damageEffect = skill.effects.find(e => e.type === SkillEffectType.DAMAGE);
        if (damageEffect) {
            return damageEffect;
        }
        
        // 否则返回第一个效果
        return skill.effects[0] || null;
    }
    
    /**
     * 检查技能是否包含指定类型的效果
     */
    private hasEffectType(skill: MonsterSkill, effectType: SkillEffectType): boolean {
        return skill.effects.some(e => e.type === effectType);
    }
}
