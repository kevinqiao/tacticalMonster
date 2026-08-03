/** 自动清盘期间禁止 GamePlayer 按 React model 重排（否则会把已收走的牌拽回 tableau） */
export const autoCompleteLayoutGate = {
    blocked: false,
};
