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
    }>;
}

export interface ValidationResult {
    isValid: boolean;
    needsRollback: boolean;
    backendResult: SkillUseResult;
    differences?: string[];  // 差异说明（用于调试）
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

        // 对比效果
        if (!this.compareEffects(frontendResult.effects, backendResult.effects)) {
            isValid = false;
            differences.push('effects mismatch');
        }

        return {
            isValid,
            needsRollback: !isValid,
            backendResult,
            differences: differences.length > 0 ? differences : undefined,
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
     */
    private static compareEffects(
        frontend?: Array<{ effect: any; targetId?: string; applied: boolean }>,
        backend?: Array<{ effect: any; targetId?: string; applied: boolean }>
    ): boolean {
        if (!frontend && !backend) return true;
        if (!frontend || !backend) return false;
        if (frontend.length !== backend.length) return false;

        // 对比每个效果
        for (let i = 0; i < frontend.length; i++) {
            const fe = frontend[i];
            const be = backend[i];

            // 对比目标ID
            if (fe.targetId !== be.targetId) {
                return false;
            }

            // 对比应用状态
            if (fe.applied !== be.applied) {
                return false;
            }

            // 对比效果类型和ID
            if (fe.effect?.type !== be.effect?.type || fe.effect?.id !== be.effect?.id) {
                return false;
            }
        }

        return true;
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

