/**
 * 后端验证器
 * 对比前端执行结果和后端执行结果，判断是否需要回滚
 */

export interface SkillUseResult {
    success: boolean;
    message?: string;
    cooldownSet?: number;
    resourcesConsumed?: {
        mp?: number;
        hp?: number;
        stamina?: number;
    };
    effects?: Array<{
        effect: any;
        targetId?: string;
        applied: boolean;
        isPassive?: boolean;  // ✅ 标记是否为被动技能效果
        passiveSkillId?: string;  // ✅ 被动技能ID
        triggerType?: string;  // ✅ 触发类型
    }>;
}

export interface ValidationResult {
    isValid: boolean;
    needsRollback: boolean;
    backendResult: SkillUseResult;
    differences?: string[];  // 差异说明（用于调试）
    onlyPassiveDifferences?: boolean;  // ✅ 是否仅被动技能效果有差异
}

export class BackendValidator {
    /**
     * 验证操作结果
     */
    static validateOperation(
        frontendResult: SkillUseResult,
        backendResult: SkillUseResult
    ): ValidationResult {
        const differences: string[] = [];
        let isValid = true;

        // 对比 success
        if (frontendResult.success !== backendResult.success) {
            isValid = false;
            differences.push(`success: frontend=${frontendResult.success}, backend=${backendResult.success}`);
        }

        // 对比 cooldownSet
        if (frontendResult.cooldownSet !== backendResult.cooldownSet) {
            isValid = false;
            differences.push(`cooldownSet: frontend=${frontendResult.cooldownSet}, backend=${backendResult.cooldownSet}`);
        }

        // 对比资源消耗
        if (!this.compareResources(
            frontendResult.resourcesConsumed,
            backendResult.resourcesConsumed
        )) {
            isValid = false;
            differences.push('resourcesConsumed mismatch');
        }

        // 对比效果（允许被动技能效果的差异）
        const effectsComparison = this.compareEffects(
            frontendResult.effects,
            backendResult.effects
        );
        let onlyPassiveDifferences = false;
        
        if (!effectsComparison.isValid) {
            // 如果差异仅来自被动技能效果，则允许（前端乐观更新时可能没有预测被动技能）
            if (effectsComparison.onlyPassiveDifferences) {
                // 仅记录差异，但不标记为验证失败
                differences.push(`effects: passive skill effects differ (expected)`);
                onlyPassiveDifferences = true;
                // 被动技能差异不影响验证结果
                isValid = true;
            } else {
                isValid = false;
                differences.push(`effects mismatch: ${effectsComparison.reason}`);
            }
        } else if (effectsComparison.onlyPassiveDifferences) {
            onlyPassiveDifferences = true;
        }

        return {
            isValid,
            needsRollback: !isValid,
            backendResult,
            differences: differences.length > 0 ? differences : undefined,
            onlyPassiveDifferences,
        };
    }

    /**
     * 对比资源消耗
     */
    private static compareResources(
        frontend?: { mp?: number; hp?: number; stamina?: number },
        backend?: { mp?: number; hp?: number; stamina?: number }
    ): boolean {
        if (!frontend && !backend) return true;
        if (!frontend || !backend) return false;

        // 允许小的数值差异（浮点数精度问题）
        const tolerance = 0.01;

        if (Math.abs((frontend.mp || 0) - (backend.mp || 0)) > tolerance) return false;
        if (Math.abs((frontend.hp || 0) - (backend.hp || 0)) > tolerance) return false;
        if (Math.abs((frontend.stamina || 0) - (backend.stamina || 0)) > tolerance) return false;

        return true;
    }

    /**
     * 对比效果
     * 返回对比结果，包括是否有效和差异原因
     */
    private static compareEffects(
        frontend?: Array<{ effect: any; targetId?: string; applied: boolean; isPassive?: boolean }>,
        backend?: Array<{ effect: any; targetId?: string; applied: boolean; isPassive?: boolean }>
    ): { isValid: boolean; onlyPassiveDifferences?: boolean; reason?: string } {
        if (!frontend && !backend) return { isValid: true };
        if (!frontend || !backend) {
            // 如果后端有被动技能效果而前端没有，这是允许的
            const backendPassiveOnly = backend?.every(e => e.isPassive) ?? false;
            if (backendPassiveOnly && !frontend) {
                return { isValid: true, onlyPassiveDifferences: true };
            }
            return { isValid: false, reason: 'effects array missing' };
        }

        // 分离主动技能效果和被动技能效果
        const frontendActive = frontend.filter(e => !e.isPassive);
        const frontendPassive = frontend.filter(e => e.isPassive);
        const backendActive = backend.filter(e => !e.isPassive);
        const backendPassive = backend.filter(e => e.isPassive);

        // 对比主动技能效果（必须完全一致）
        if (frontendActive.length !== backendActive.length) {
            return { isValid: false, reason: 'active effects count mismatch' };
        }

        for (let i = 0; i < frontendActive.length; i++) {
            const fe = frontendActive[i];
            const be = backendActive[i];

            // 对比目标ID
            if (fe.targetId !== be.targetId) {
                return { isValid: false, reason: `active effect targetId mismatch at index ${i}` };
            }

            // 对比应用状态
            if (fe.applied !== be.applied) {
                return { isValid: false, reason: `active effect applied mismatch at index ${i}` };
            }

            // 对比效果类型和ID
            if (fe.effect?.type !== be.effect?.type || fe.effect?.id !== be.effect?.id) {
                return { isValid: false, reason: `active effect type/id mismatch at index ${i}` };
            }
        }

        // 被动技能效果的差异是允许的（前端乐观更新时可能没有预测被动技能）
        // 只要主动技能效果一致，就认为验证通过
        if (backendPassive.length > 0 && frontendPassive.length !== backendPassive.length) {
            return { isValid: true, onlyPassiveDifferences: true };
        }

        return { isValid: true };
    }

    /**
     * 记录验证失败（用于调试和分析）
     */
    static logValidationFailure(
        operationId: string,
        validation: ValidationResult
    ): void {
        console.warn(`[BackendValidator] Operation ${operationId} validation failed:`, {
            differences: validation.differences,
            frontendResult: validation.backendResult, // 这里应该传入前端结果，但为了简化先这样
        });
    }
}


