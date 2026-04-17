import type { PageContainer } from "service/PageManager";
import { normalizePageUri } from "@/util/PageUtils";

/**
 * 与历史「left: (i-center)% + 同一套 x%」全宽子页等价：最终 left% = (子页下标 - 目标下标) * 100
 * 不使用 transform，避免子页 overflow 原生滚动条在 Chromium 上无法拖动。
 */
export function childLeftPercent(
  childIndex: number,
  targetChildIndex: number
): number {
  return (childIndex - targetChildIndex) * 100;
}

/** 解析当前要露出的子页在 children 中的下标（兼容 uri 全路径 / 末段） */
export function resolveChildIndexByUri(
  kids: PageContainer[] | undefined,
  pageUri: string
): number {
  if (!kids?.length) return -1;
  const p = normalizePageUri(pageUri);
  const direct = kids.findIndex((c) => normalizePageUri(c.uri) === p);
  if (direct >= 0) return direct;
  const lastSeg = pageUri.split("/").filter(Boolean).pop() ?? "";
  if (!lastSeg) return -1;
  const byTail = kids.findIndex(
    (c) =>
      normalizePageUri(c.uri) === lastSeg ||
      normalizePageUri(c.uri).endsWith("/" + lastSeg)
  );
  if (byTail >= 0) return byTail;
  return kids.findIndex((c) => normalizePageUri(pageUri).endsWith(normalizePageUri(c.uri)));
}

/** @deprecated 兼容旧命名，后续请使用 childLeftPercent */
export const lobbyChildLeftPercent = childLeftPercent;
/** @deprecated 兼容旧命名，后续请使用 resolveChildIndexByUri */
export const resolveLobbyChildIndex = resolveChildIndexByUri;
