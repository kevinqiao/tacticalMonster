/**
 * 效果处理器注册中心
 * 按 SkillEffectType 查找对应的 EffectHandler，供 SkillManager 和 StatusEffectProcessor 使用
 */

import type { SkillEffectType } from "../../../types/skillTypes";
import { BuffHandler } from "./duration/BuffHandler";
import { DebuffHandler } from "./duration/DebuffHandler";
import { DotHandler } from "./duration/DotHandler";
import { HotHandler } from "./duration/HotHandler";
import { StunHandler } from "./duration/StunHandler";
import type { EffectHandler } from "./EffectHandler";
import { DamageHandler } from "./immediate/DamageHandler";
import { HealHandler } from "./immediate/HealHandler";
import { CleanseHandler } from "./immediate/CleanseHandler";
import { MovementHandler } from "./immediate/MovementHandler";
import { MpDrainHandler } from "./immediate/MpDrainHandler";
import { MpRestoreHandler } from "./immediate/MpRestoreHandler";
import { ShieldHandler } from "./immediate/ShieldHandler";
import { TeleportHandler } from "./immediate/TeleportHandler";

export class EffectHandlerRegistry {
    private static handlers: Map<SkillEffectType, EffectHandler> = new Map();
    private static initialized = false;

    static register(handler: EffectHandler): void {
        this.handlers.set(handler.type, handler);
    }

    static getHandler(type: SkillEffectType): EffectHandler | undefined {
        if (!this.initialized) {
            this.initialize();
        }
        return this.handlers.get(type);
    }

    /** 注册所有处理器（懒加载，首次 getHandler 时执行） */
    static initialize(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.register(new DamageHandler());
        this.register(new HealHandler());
        this.register(new CleanseHandler());
        this.register(new ShieldHandler());
        this.register(new MpDrainHandler());
        this.register(new MpRestoreHandler());
        this.register(new MovementHandler());
        this.register(new TeleportHandler());
        this.register(new BuffHandler());
        this.register(new DebuffHandler());
        this.register(new DotHandler());
        this.register(new HotHandler());
        this.register(new StunHandler());
    }
}
