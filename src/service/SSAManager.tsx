import React, { ReactNode } from "react";

/**
 * SSAProvider - 简单的包装组件
 * 用于提供应用上下文（如果需要的话）
 */
export const SSAProvider: React.FC<{ app: string; children: ReactNode }> = ({ children }) => {
  // 目前只是一个简单的包装，不提供任何功能
  return <>{children}</>;
};

/**
 * useSSAManager - Hook for accessing SSA manager (if needed)
 */
export const useSSAManager = () => {
  // 返回空对象，保持向后兼容
  return {};
};
