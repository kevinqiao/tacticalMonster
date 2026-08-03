export interface GameVisualComponents {
  card_face?: string;
  card_back?: string;
  table_bg?: string;
  piece_set?: string;
  board_bg?: string;
}

export interface ResolvedGameVisualTheme {
  skinId: string;
  visualKey: string;
  components: GameVisualComponents;
}
