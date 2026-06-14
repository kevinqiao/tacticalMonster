import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React, { useMemo } from 'react';

import type { CasualWatchContext } from '../../../shared/casualAsyncTableSummaryUI';

import '../style.css';
import SolitaireWatchOverlay from './SolitaireWatchOverlay';

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_SOLITAIRE ?? 'https://artful-chipmunk-59.convex.cloud';

type Props = {
  open: boolean;
  watchContext: CasualWatchContext | null;
  displayLabel: string;
  onClose: () => void;
};

/** 大厅/历史等非对局页：自带 solitaireArena Convex，打开观战/复盘 overlay。 */
export const SolitaireLobbyWatchOverlay: React.FC<Props> = (props) => {
  const client = useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ConvexProvider client={client}>
      <SolitaireWatchOverlay {...props} />
    </ConvexProvider>
  );
};

export default SolitaireLobbyWatchOverlay;
