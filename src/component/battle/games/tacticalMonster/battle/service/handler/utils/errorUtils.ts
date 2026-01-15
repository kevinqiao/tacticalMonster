/**
 * 错误处理工具函数
 */

import { OperationQueue } from "../../optimistic/OperationQueue";

/**
 * 处理后端错误
 */
export const handleBackendError = (
    error: any,
    pendingUpdate: { rollback: () => void },
    operationId: string,
    operationQueue: OperationQueue
) => {
    console.error("Backend operation failed", error);
    pendingUpdate.rollback();
    operationQueue.rollbackOperation(operationId);
};

