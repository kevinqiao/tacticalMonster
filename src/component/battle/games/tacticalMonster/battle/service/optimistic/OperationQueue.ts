/**
 * 操作队列管理器
 * 管理待验证的操作，支持确认和回滚
 */

export interface PendingOperation {
    id: string;                    // 操作唯一ID
    type: 'useSkill' | 'walk' | 'attack';
    timestamp: number;              // 操作时间戳
    operationIndex: number;        // 操作序列号（用于随机数生成）
    snapshot: any;                 // 操作前的状态快照
    rollback: () => void;          // 回滚函数
    data: any;                      // 操作数据
    confirmed: boolean;             // 是否已确认
}

export class OperationQueue {
    private queue: Map<string, PendingOperation> = new Map();
    private operationIndex: number = 0;
    private confirmedOperations: Set<string> = new Set();

    /**
     * 添加操作到队列
     */
    addOperation(operation: Omit<PendingOperation, 'id' | 'operationIndex' | 'confirmed'>): string {
        const id = this.generateOperationId();
        const operationIndex = this.getNextOperationIndex();

        const pendingOperation: PendingOperation = {
            ...operation,
            id,
            operationIndex,
            confirmed: false,
        };

        this.queue.set(id, pendingOperation);
        return id;
    }

    /**
     * 确认操作（后端验证通过）
     */
    confirmOperation(operationId: string): boolean {
        const operation = this.queue.get(operationId);
        if (!operation) {
            console.warn(`Operation ${operationId} not found`);
            return false;
        }

        operation.confirmed = true;
        this.confirmedOperations.add(operationId);

        // 清理已确认的操作（保留最近10个用于调试）
        this.cleanupOldOperations();

        return true;
    }

    /**
     * 回滚操作（后端验证失败）
     */
    rollbackOperation(operationId: string): boolean {
        const operation = this.queue.get(operationId);
        if (!operation) {
            console.warn(`Operation ${operationId} not found`);
            return false;
        }

        try {
            operation.rollback();
            this.queue.delete(operationId);
            return true;
        } catch (error) {
            console.error(`Failed to rollback operation ${operationId}:`, error);
            return false;
        }
    }

    /**
     * 获取下一个操作序列号
     */
    getNextOperationIndex(): number {
        return this.operationIndex++;
    }

    /**
     * 获取操作
     */
    getOperation(operationId: string): PendingOperation | undefined {
        return this.queue.get(operationId);
    }

    /**
     * 获取所有待确认的操作
     */
    getPendingOperations(): PendingOperation[] {
        return Array.from(this.queue.values())
            .filter(op => !op.confirmed)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * 检查操作是否已确认
     */
    isOperationConfirmed(operationId: string): boolean {
        return this.confirmedOperations.has(operationId);
    }

    /**
     * 清理旧操作
     */
    private cleanupOldOperations(): void {
        const confirmedOps = Array.from(this.queue.values())
            .filter(op => op.confirmed)
            .sort((a, b) => b.timestamp - a.timestamp);

        // 只保留最近10个已确认的操作
        if (confirmedOps.length > 10) {
            const toRemove = confirmedOps.slice(10);
            toRemove.forEach(op => {
                this.queue.delete(op.id);
                this.confirmedOperations.delete(op.id);
            });
        }
    }

    /**
     * 生成操作ID
     */
    private generateOperationId(): string {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 清空队列（用于测试或重置）
     */
    clear(): void {
        this.queue.clear();
        this.confirmedOperations.clear();
        this.operationIndex = 0;
    }
}

