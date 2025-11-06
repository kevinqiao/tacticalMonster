/**
 * 单人纸牌游戏管理器
 * 基于 solitaire 的多人版本，简化为单人玩法
 */
import { useConvex } from 'convex/react';
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useRef } from 'react';
import { useUserManager } from 'service/UserManager';
import { PlayerMatch } from './MatchTypes';


interface IMatchContext {
    matchState: PlayerMatch | null;
    searchView: RefObject<HTMLDivElement> | null;
    reportView: RefObject<HTMLDivElement> | null;
    openReport: () => void;
}

const MatchContext = createContext<IMatchContext>({
    matchState: null,
    searchView: null,
    reportView: null,
    openReport: () => { },
});

export const useMatchManager = () => {
    const context = useContext(MatchContext);
    if (!context) {
        throw new Error('useMatchManager must be used within a MatchProvider');
    }
    return context;
};

interface MatchProviderProps {
    children: ReactNode;
    match: PlayerMatch | null;
}

export const MatchProvider: React.FC<MatchProviderProps> = ({ children, match }) => {
    const searchView = useRef<HTMLDivElement>(null);
    const reportView = useRef<HTMLDivElement>(null);
    // const [matchState, setMatchState] = useState<PlayerMatch | null>(null);
    const { user } = useUserManager();
    const convex = useConvex();
    const openReport = useCallback(async () => {
        // if (match?.matchId) {
        //     const reportData = await convex.query(api.service.tournament.matchManager.findReport, { matchId: match?.matchId });
        //     if (reportData) {
        //         gsap.set(reportView.current, { autoAlpha: 1 });
        //     }

        // }
    }, [match]);
    // useEffect(() => {
    //     const load = async () => {
    //         if (matchId) {
    //             const matchData = await convex.query(api.service.tournament.matchManager.findMatch, { matchId: matchId, uid: user?.uid });
    //             setMatchState(matchData);
    //         }
    //     }
    //     load();
    // }, [matchId, user]);


    const value: IMatchContext = {
        matchState: match,
        searchView,
        reportView,
        openReport,
    };

    return (
        <MatchContext.Provider value={value}>
            {children}
        </MatchContext.Provider>
    );
};

export default MatchProvider;
