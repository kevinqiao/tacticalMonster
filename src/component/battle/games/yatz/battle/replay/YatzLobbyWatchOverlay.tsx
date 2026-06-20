import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React, { useMemo } from 'react';

import type { Match3WatchContext } from '../../../shared/casualAsyncTableSummaryUI';

import '../style.css';
import YatzWatchOverlay from './YatzWatchOverlay';

const convexUrl =
  import.meta.env.VITE_CONVEX_URL_YATZ ?? 'https://precious-retriever-7.convex.cloud';

type Props = {
  open: boolean;
  watchContext: Match3WatchContext | null;
  displayLabel: string;
  onClose: () => void;
};

/** 大厅/历史等非对局页：自带 yatzArena Convex，打开观战/复盘 overlay。 */
export const YatzLobbyWatchOverlay: React.FC<Props> = (props) => {
  const client = useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ConvexProvider client={client}>
      <YatzWatchOverlay {...props} />
    </ConvexProvider>
  );
};

export default YatzLobbyWatchOverlay;
