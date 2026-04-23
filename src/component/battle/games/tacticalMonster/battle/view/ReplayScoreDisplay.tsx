/**
 * 重播计分 overlay：`game` 来自 CombatManager，`replay` 来自 replayContext。
 * 3D：由 BattleVenue3DSpectator 挂载；2D：由 BattlePlayer 挂载。
 */
import { getScoringConfigVersionsList } from '../../../../../../convex/tacticalMonster/convex/data/scoringConfigs';
import { useCombatManager } from '../../service/CombatManager';
import { useScoreCalculation } from '../hooks/useScoreCalculation';
import { useReplay } from './replayContext';

export function ReplayScoreDisplay() {
    const { game, mode } = useCombatManager();
    const replay = useReplay();

    if (mode !== 'replay' || !game || !replay) {
        return null;
    }

    const events = [
        {
            _id: "1",
            time: 1000,
        },
        {
            _id: "2",
            time: 2000,
        },
    ];
    const currentEventIndex = replay.state.currentIndex ?? 0;

    if (events.length === 0) {
        return null;
    }
    const {
        eventScores,
        cumulativeScores,
        currentConfigVersion,
        setCurrentConfigVersion
    } = useScoreCalculation(game, events, 'replay');

    const currentEvent = events[currentEventIndex];
    const currentEventScore = currentEvent
        ? eventScores.get(currentEvent._id || currentEvent.time.toString()) || 0
        : 0;
    const currentCumulativeScore = currentEvent
        ? cumulativeScores.get(currentEvent._id || currentEvent.time.toString()) || 0
        : 0;

    const availableVersions = getScoringConfigVersionsList();

    return (
        <div className="replay-score-display" style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            minWidth: '200px',
            zIndex: 1000
        }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>计分信息</div>

            <div style={{ marginBottom: '8px' }}>
                <div>当前事件得分: <span style={{ color: '#4CAF50' }}>{currentEventScore}</span></div>
                <div>累积得分: <span style={{ color: '#2196F3' }}>{currentCumulativeScore}</span></div>
            </div>

            <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                    配置版本:
                </label>
                <select
                    value={currentConfigVersion}
                    onChange={(e) => setCurrentConfigVersion(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '5px',
                        borderRadius: '4px',
                        background: '#333',
                        color: 'white',
                        border: '1px solid #555'
                    }}
                >
                    {availableVersions.map(({ version }) => (
                        <option key={version} value={version}>
                            {version}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

