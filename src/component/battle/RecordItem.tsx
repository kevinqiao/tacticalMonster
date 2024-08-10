import RewardItem from "component/battle/RewardItem";
import DateIcon from "component/icons/DateIcon";
import LeaderboardIcon from "component/icons/LeaderboardIcon";
import PlayersIcon from "component/icons/PlayersIcon";
import PrizeIcon from "component/icons/PrizeIcon";
import { useConvex } from "convex/react";
import { APP_EVENT } from "model/Constants";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/_generated/api";
import "./battle.css";
const TounamentTitle: React.FC<{ tournamentId: string }> = ({ tournamentId }) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(20);

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 55; // 示例计算方法
      setFontSize(newFontSize);
    }
  };

  useEffect(() => {
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    return () => {
      window.removeEventListener("resize", calculateFontSize);
    };
  }, []);
  return (
    <div ref={divRef} style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
      <span className="roboto-black-italic" style={{ fontSize: Math.max(fontSize + 5, 20) }}>
        Tournament({tournamentId})
      </span>
    </div>
  );
};
interface Props {
  tournamentId: string;
  battleId: string;
  leaderboard?: any;
  time: number;
  reward?: any;
  participants: number;
  status: number;
  type?: number;
}

const RecordItem: React.FC<Props> = ({
  tournamentId,
  battleId,
  time,
  leaderboard,
  reward,
  participants,
  status,
  type,
}) => {
  const { createEvent } = useEventSubscriber([], []);
  const { width, height } = useCoord();
  const { user } = useUserManager();
  const { event } = useEventSubscriber([APP_EVENT.REWARD_CLAIM], [battleId]);
  const { openPage } = usePageManager();
  const [collected, setCollected] = useState(-1);
  const convex = useConvex();
  const openLeaderboard = () => {
    if (leaderboard)
      openPage({
        name: "leaderboard",
        app: "match3",
        data: { tournament: { id: leaderboard.tournamentId, term: leaderboard.term }, battleId },
      });
    else if (battleId) {
      openPage({
        name: "leaderboard",
        app: "match3",
        data: { battleId },
      });
    }
  };
  useEffect(() => {
    if (leaderboard && leaderboard.reward) setCollected(leaderboard.collected ? 1 : 0);
    else if (reward) {
      setCollected(reward.collected ? 1 : 0);
    }
  }, [leaderboard, reward]);
  useEffect(() => {
    if (event && collected <= 0) setCollected(1);
  }, [event]);

  const collect = useCallback(async () => {
    if (!user) return;

    const res = await convex.mutation(api.tournaments.claim, {
      uid: user.uid,
      token: user.token,
      leaderboardId: leaderboard ? battleId : undefined,
      battleId: leaderboard ? undefined : battleId,
    });
    if (res.ok) {
      createEvent({ name: "assetCollected", topic: "asset", data: res.data, delay: 0 });
      setCollected(1);
    }
  }, [convex, user, leaderboard, battleId]);
  const award = useMemo(() => {
    if (leaderboard?.reward) return { battleId, collected: leaderboard.collected, assets: leaderboard.reward };
    if (reward) return { battleId, collected: reward.collected, assets: reward.assets };
    return null;
  }, [leaderboard, reward]);
  const rank = useMemo(() => {
    if (leaderboard) return leaderboard.rank;
    else if (reward) return reward.rank;
    return null;
  }, [leaderboard, reward]);

  return (
    <div className="battle-item roboto-regular" style={{ width: width > height ? "90%" : "100%" }}>
      <div className="trophy">
        <PrizeIcon rank={rank}></PrizeIcon>
      </div>
      <div style={{ width: "65%" }}>
        <div style={{ height: "30%", width: "100%" }}>
          <TounamentTitle tournamentId={tournamentId} />
        </div>
        <div className="summary roboto-regular">
          <div style={{ width: "45%", maxWidth: 150, marginLeft: 5 }}>
            <PlayersIcon players={participants} />
          </div>
          <div style={{ width: "45%", maxWidth: 150 }}>
            <DateIcon date={moment(time).format("MM-DD HH:mm")} />
          </div>
          <div style={{ width: "55%", maxWidth: 200, marginLeft: 30 }} onClick={openLeaderboard}>
            <LeaderboardIcon />
          </div>
        </div>
        <div style={{ height: 20 }}></div>
      </div>
      <div className="reward">
        {status > 0 ? (
          <>
            <RewardItem reward={award} />
            {collected === 0 ? (
              <div
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "80%",
                  maxWidth: 100,
                  height: "20%",
                  backgroundColor: "blue",
                  borderRadius: 4,
                }}
                onClick={collect}
              >
                <span style={{ color: "white" }}>Collect</span>
              </div>
            ) : null}
          </>
        ) : (
          <div>In Progress</div>
        )}
      </div>
    </div>
  );
};

export default RecordItem;
