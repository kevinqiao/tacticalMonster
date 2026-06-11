/**
 * 异步 run 桌：过期 promote + 全桌可终局时 finalize（cron / confirm 共用）。
 * 实现位于 casualRunIngestCore，此文件仅 re-export 以保持 import 路径稳定。
 */
export {
  tryFinalizeCasualAsyncMatch,
  type TryFinalizeCasualAsyncMatchResult,
} from "../submit/casualRunIngestCore";
