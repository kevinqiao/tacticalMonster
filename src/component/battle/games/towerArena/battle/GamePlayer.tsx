import React, { useCallback, useMemo, useState } from 'react';
import { useTowerGame } from './service/GameManager';
import { useTowerActHandler } from './service/handler/useActHandler';
import { useWavePlayback } from './hooks/useWavePlayback';
import TowerArenaBoard from './view/TowerArenaBoard';

const TOWER_NAMES: Record<string, string> = {
  archer: '弓箭塔',
  cannon: '火炮塔',
  mage: '法师塔',
};

const ERROR_MSG: Record<string, string> = {
  insufficient_gold: '金币不足',
  slot_occupied: '该位置已有塔',
  not_build_phase: '当前不能建造',
  tower_locked: '该塔尚未解锁',
  no_tower: '此处没有塔',
  max_level: '已达最高等级',
  game_ended: '对局已结束',
};

function phaseLabel(phase: string, wavePlaying: boolean): string {
  if (wavePlaying) return '战斗中…';
  if (phase === 'build') return '建造阶段';
  if (phase === 'wave') return '波次进行中';
  if (phase === 'ended') return '对局结束';
  return phase;
}

const GamePlayer: React.FC = () => {
  const { game, loading, error, replayCasualRun } = useTowerGame();
  const { place, upgrade, sell, startWaveAnimated, concedeAndSubmit, busy } = useTowerActHandler();
  const { frame, playing, playWave } = useWavePlayback();
  const [pickTower, setPickTower] = useState('archer');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const phaseBuild = game?.phase === 'build' && !playing;
  const ended = game?.phase === 'ended';
  const hint = useMemo(() => {
    if (!game?.seed) return '';
    if (ended) return '对局已结束，可提交分数或再战。';
    if (playing) return '敌人正在沿路径前进，塔会自动攻击。';
    if (phaseBuild && game.towers.length === 0) {
      return '① 选择塔类型 → ② 点击地图上的 + 放塔 → ③ 开始波次';
    }
    if (phaseBuild) return '可升级/出售已选中的塔，准备好后点击「开始波次」。';
    return '';
  }, [game, ended, playing, phaseBuild]);

  if (loading) {
    return (
      <div className="tower-game-container">
        <div className="tower-loading">加载战场…</div>
      </div>
    );
  }
  if (error || !game?.seed) {
    return (
      <div className="tower-game-container" role="alert">
        <div className="tower-error">无法加载对局：{error ?? 'unknown'}</div>
      </div>
    );
  }

  const seed = game.seed;
  const catalog = seed.towerCatalog;
  const totalWaves = seed.waves.length;
  const canInteract = phaseBuild && !ended && !busy;

  const pickDef = catalog.find((t) => t.id === pickTower);
  const affordPlace = pickDef ? game.gold >= pickDef.cost : false;

  const onSlotClick = async (slotId: string) => {
    if (!canInteract) return;
    const occupied = game.towers.find((t) => t.slotId === slotId);
    if (!occupied && pickTower) {
      const res = await place(slotId, pickTower);
      if (res?.ok === false && res.error) {
        showToast(ERROR_MSG[res.error] ?? res.error);
      } else {
        setSelectedSlot(slotId);
      }
      return;
    }
    setSelectedSlot(slotId);
  };

  const onStartWave = async () => {
    if (!phaseBuild || game.towers.length === 0) {
      showToast('请至少放置一座塔再开始波次');
      return;
    }
    setWaveBanner(`第 ${game.currentWave + 1} 波进攻！`);
    const prevLives = game.lives;
    const prevGold = game.gold;
    const prevCleared = game.wavesCleared;

    const res = await startWaveAnimated(async () => {
      await playWave(seed, game.currentWave, game.towers);
    });

    setWaveBanner(null);
    if (res?.ok !== false && res) {
      const lives = res.lives ?? prevLives;
      const cleared = res.wavesCleared ?? prevCleared;
      const gold = res.gold ?? prevGold;
      if (lives < prevLives) {
        showToast(`有敌人突破！生命 -${prevLives - lives}`);
      } else if (cleared > prevCleared) {
        showToast(`第 ${cleared} 波已清除！+${gold - prevGold} 金币`);
      }
    }
  };

  const selectedTower = selectedSlot
    ? game.towers.find((t) => t.slotId === selectedSlot)
    : null;
  const selectedDef = selectedTower
    ? catalog.find((t) => t.id === selectedTower.towerId)
    : null;
  const upgradeCost =
    selectedTower && selectedDef
      ? selectedDef.statsByLevel[selectedTower.level - 1]?.upgradeCost ?? 0
      : 0;

  return (
    <div className="tower-game-layout">
      <header className="tower-hud">
        <div className="tower-hud__group">
          <span className="tower-hud__lives" title="生命">
            {'❤'.repeat(Math.max(0, Math.min(5, game.lives)))}
            {game.lives > 5 ? ` +${game.lives - 5}` : ''}
          </span>
          <span className="tower-hud__pill tower-hud__gold">🪙 {game.gold}</span>
          <span className="tower-hud__pill">
            波次 {Math.min(game.currentWave + 1, totalWaves)}/{totalWaves}
          </span>
          <span className="tower-hud__pill tower-hud__score">得分 {game.score}</span>
        </div>
        <div className="tower-hud__phase">{phaseLabel(game.phase, playing)}</div>
      </header>

      {waveBanner ? <div className="tower-banner tower-banner--wave">{waveBanner}</div> : null}
      {hint ? <p className="tower-hint">{hint}</p> : null}

      <div className="tower-board-wrap">
        <TowerArenaBoard
          seed={seed}
          towers={game.towers}
          selectedSlotId={selectedSlot}
          pickTowerId={pickTower}
          waveFrame={frame}
          canPlace={canInteract}
          onSlotClick={(id) => void onSlotClick(id)}
        />
      </div>

      <footer className="tower-toolbar">
        <div className="tower-shop">
          <span className="tower-shop__title">建造</span>
          {catalog
            .filter((t) => game.unlockedTowerIds.includes(t.id))
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tower-shop__btn tower-shop__btn--${t.id} ${
                  pickTower === t.id ? 'tower-shop__btn--active' : ''
                } ${game.gold < t.cost ? 'tower-shop__btn--disabled' : ''}`}
                disabled={!canInteract}
                onClick={() => setPickTower(t.id)}
              >
                <span className="tower-shop__name">{TOWER_NAMES[t.id] ?? t.id}</span>
                <span className="tower-shop__cost">{t.cost}g</span>
              </button>
            ))}
        </div>

        <div className="tower-actions">
          <button
            type="button"
            className="tower-actions__primary"
            disabled={!canInteract || !affordPlace}
            onClick={() => void onStartWave()}
          >
            {playing ? '战斗中…' : '开始波次'}
          </button>
          {selectedTower ? (
            <>
              <button
                type="button"
                disabled={!canInteract || game.gold < upgradeCost}
                onClick={async () => {
                  const res = await upgrade(selectedSlot!);
                  if (res?.ok === false && res.error) showToast(ERROR_MSG[res.error] ?? res.error);
                }}
              >
                升级 ({upgradeCost}g)
              </button>
              <button
                type="button"
                disabled={!canInteract}
                onClick={async () => {
                  const res = await sell(selectedSlot!);
                  if (res?.ok === false && res.error) showToast(ERROR_MSG[res.error] ?? res.error);
                }}
              >
                出售
              </button>
            </>
          ) : null}
          {!ended ? (
            <button type="button" className="tower-actions__ghost" disabled={busy} onClick={() => void concedeAndSubmit()}>
              结束并提交
            </button>
          ) : game.gameId.startsWith('game_') ? (
            <button type="button" disabled={busy} onClick={() => void replayCasualRun()}>
              再战
            </button>
          ) : null}
        </div>
      </footer>

      {toast ? <div className="tower-toast">{toast}</div> : null}
    </div>
  );
};

export default GamePlayer;
