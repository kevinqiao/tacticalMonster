import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React, { useMemo } from 'react';

import type { Match3WatchContext } from '../../../shared/casualAsyncTableSummaryUI';

import '../style.css';
import Match3WatchOverlay from './Match3WatchOverlay';

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_MATCH3 ?? 'https://strong-condor-681.convex.cloud';

type Props = {
  open: boolean;
  watchContext: Match3WatchContext | null;
  displayLabel: string;
  onClose: () => void;
};

/** 大厅/历史等非对局页：自带 match3Arena Convex，打开观战/复盘 overlay。 */
export const Match3LobbyWatchOverlay: React.FC<Props> = (props) => {
  const client = useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ConvexProvider client={client}>
      <Match3WatchOverlay {...props} />
    </ConvexProvider>
  );
};

export default Match3LobbyWatchOverlay;
