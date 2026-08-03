/** 休闲对局弹层：拦截 RenderModal 左上角关闭，改走「结束并结算」而非直接关窗。 */
type CasualGameModalExitHandler = () => void;

let activeExitHandler: CasualGameModalExitHandler | null = null;

export function registerCasualGameModalExitHandler(handler: CasualGameModalExitHandler | null): void {
  activeExitHandler = handler;
}

/** @returns true 表示已交给对局处理，不应直接 dismiss modal */
export function requestCasualGameModalExit(): boolean {
  if (!activeExitHandler) return false;
  activeExitHandler();
  return true;
}
