// ============================================================
// SetRecordingPage — 实时记录向导 (核心页面)
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Flag, Undo2 } from 'lucide-react';
import { useRecordingStore } from '@/stores/recording-store';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import {
  isServeTerminal,
  isAttackTerminal,
  isFinalEffectTerminal,
} from '@/types/actions';
import type { RallySide, RallyOutcome } from '@/types';
import type {
  ServeAction,
  ReceptionAction,
  SetAction,
  AttackAction,
  BlockDefenseAction,
  TransitionAction,
  RallyAction,
  ServeType,
  CourtZone,
  ReceptionQuality,
  SetQuality,
  AttackLine,
  OpponentBlock,
  AttackResult,
  BlockEffect,
  DefenseEffect,
  FinalEffect,
  BlockProtection,
  SecondTouchQuality,
} from '@/types';
import { v4 as uuid } from 'uuid';

// ============================================================
// Step Panels (小的子组件)
// ============================================================

function ServeChoicePanel({ onSelect }: { onSelect: (side: RallySide) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center">谁发球？</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelect('serving')}
          className="touch-target bg-primary-600 rounded-xl py-8 text-center active:bg-primary-700 transition-all"
        >
          <div className="text-3xl mb-2">🏐</div>
          <div className="text-lg font-bold">我方发球</div>
        </button>
        <button
          onClick={() => onSelect('receiving')}
          className="touch-target bg-slate-700 rounded-xl py-8 text-center active:bg-slate-600 transition-all"
        >
          <div className="text-3xl mb-2">🛡️</div>
          <div className="text-lg font-bold">对方发球</div>
        </button>
      </div>
    </div>
  );
}

function ServePanel({
  mode,
  players,
  onSubmit,
}: {
  mode: string;
  players: number[];
  onSubmit: (action: ServeAction) => void;
}) {
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [serveType, setServeType] = useState<ServeType | null>(null);
  const [landingZone, setLandingZone] = useState<CourtZone | null>(null);
  const [targetedPlayer, setTargetedPlayer] = useState(false);
  const [result, setResult] = useState<ServeAction['result'] | null>(null);

  const canSubmit = playerNumber && serveType && landingZone && result;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      id: uuid(),
      type: 'serve',
      sequenceOrder: 0,
      playerNumber,
      serveType,
      landingZone,
      targetedPlayer: mode === 'own' ? targetedPlayer : false,
      result,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">发球记录</h2>

      {/* 球员选择 */}
      <Section label="发球球员">
        <PlayerGrid players={players} selected={playerNumber} onSelect={setPlayerNumber} />
      </Section>

      {/* 发球方式 */}
      <Section label="发球方式">
        <div className="grid grid-cols-2 gap-2">
          {(['jump', 'float'] as ServeType[]).map((t) => (
            <Chip key={t} label={t === 'jump' ? '跳发' : '飘球'} selected={serveType === t} onClick={() => setServeType(t)} />
          ))}
        </div>
      </Section>

      {/* 落点 */}
      <Section label="发球落点">
        <ZonePicker selected={landingZone} onSelect={setLandingZone} />
      </Section>

      {/* 追发人 (仅己方) */}
      {mode === 'own' && (
        <Section label="是否发到追发人">
          <div className="grid grid-cols-2 gap-2">
            <Chip label="是" selected={targetedPlayer === true} onClick={() => setTargetedPlayer(true)} color="emerald" />
            <Chip label="否" selected={targetedPlayer === false} onClick={() => setTargetedPlayer(false)} color="slate" />
          </div>
        </Section>
      )}

      {/* 结果 */}
      <Section label="发球结果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="对方到位" selected={result === 'opponent_in_position'} onClick={() => setResult('opponent_in_position')} />
          <Chip label="对方不到位" selected={result === 'opponent_out_of_position'} onClick={() => setResult('opponent_out_of_position')} color="amber" />
          <Chip label="ACE得分" selected={result === 'ace'} onClick={() => setResult('ace')} color="emerald" prominent />
          <Chip label="失误丢分" selected={result === 'error'} onClick={() => setResult('error')} color="red" prominent />
        </div>
      </Section>

      <SubmitButton disabled={!canSubmit} onClick={handleSubmit} />
    </div>
  );
}

function ReceptionPanel({
  players,
  onSubmit,
}: {
  players: number[];
  onSubmit: (action: ReceptionAction) => void;
}) {
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [quality, setQuality] = useState<ReceptionQuality | null>(null);

  const handleSubmit = () => {
    if (!playerNumber || quality === null) return;
    onSubmit({ id: uuid(), type: 'reception', sequenceOrder: 0, playerNumber, quality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">一传记录</h2>
      <Section label="接一传球员">
        <PlayerGrid players={players} selected={playerNumber} onSelect={setPlayerNumber} />
      </Section>
      <Section label="接球到位程度">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="不到位" selected={quality === 0} onClick={() => setQuality(0)} color="red" />
          <Chip label="半到位" selected={quality === 0.5} onClick={() => setQuality(0.5)} color="amber" />
          <Chip label="到位" selected={quality === 1} onClick={() => setQuality(1)} color="emerald" />
        </div>
      </Section>
      <SubmitButton disabled={!(playerNumber && quality !== null)} onClick={handleSubmit} />
    </div>
  );
}

function SetPanel({
  players,
  onSubmit,
}: {
  players: number[];
  onSubmit: (action: SetAction) => void;
}) {
  const [positionTo, setPositionTo] = useState<CourtZone | null>(null);
  const [attackerNumber, setAttackerNumber] = useState<number | null>(null);
  const [quality, setQuality] = useState<SetQuality | null>(null);

  const handleSubmit = () => {
    if (!positionTo || !attackerNumber || !quality) return;
    onSubmit({ id: uuid(), type: 'set', sequenceOrder: 0, positionTo, attackerNumber, quality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">二传记录</h2>
      <Section label="传给几号位">
        <ZonePicker selected={positionTo} onSelect={setPositionTo} />
      </Section>
      <Section label="进攻球员">
        <PlayerGrid players={players} selected={attackerNumber} onSelect={setAttackerNumber} />
      </Section>
      <Section label="是否到位">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={quality === 'in_position'} onClick={() => setQuality('in_position')} color="emerald" />
          <Chip label="半到位" selected={quality === 'half'} onClick={() => setQuality('half')} color="amber" />
          <Chip label="不到位" selected={quality === 'out_of_position'} onClick={() => setQuality('out_of_position')} color="red" />
        </div>
      </Section>
      <SubmitButton disabled={!(positionTo && attackerNumber && quality)} onClick={handleSubmit} />
    </div>
  );
}

function AttackPanel({
  mode,
  onSubmit,
}: {
  mode: string;
  onSubmit: (action: AttackAction) => void;
}) {
  const [opponentBlock, setOpponentBlock] = useState<OpponentBlock | null>(null);
  const [attackLine, setAttackLine] = useState<AttackLine | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);

  const handleSubmit = () => {
    if (!opponentBlock || !attackLine || !result) return;
    if (mode === 'opponent' && result === 'concede') return;
    onSubmit({ id: uuid(), type: 'attack', sequenceOrder: 0, opponentBlock, attackLine, result });
  };

  const resultOptions: { value: AttackResult; label: string; color?: string; prominent?: boolean }[] = [
    { value: 'score', label: '得分', color: 'emerald', prominent: true },
    ...(mode === 'own' ? [{ value: 'concede' as AttackResult, label: '丢分', color: 'red', prominent: true }] : []),
    { value: 'blocked_back', label: '拦回继续', color: 'amber' },
    { value: 'opponent_handled', label: '对方处理', color: 'slate' },
    { value: 'opponent_counter', label: '对方形成反击', color: 'slate' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">进攻记录</h2>
      <Section label="对方拦网情况">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="形成拦网" selected={opponentBlock === 'formed'} onClick={() => setOpponentBlock('formed')} />
          <Chip label="未形成拦网" selected={opponentBlock === 'not_formed'} onClick={() => setOpponentBlock('not_formed')} color="emerald" />
        </div>
      </Section>
      <Section label="进攻线路">
        <div className="grid grid-cols-3 gap-2">
          {(['middle', 'cross', 'big_cross', 'small_cross', 'second_straight', 'straight'] as AttackLine[]).map((line) => (
            <Chip
              key={line}
              label={{ middle: '中线', cross: '大斜线', big_cross: '二直线', small_cross: '小斜线', second_straight: '腰线', straight: '直线' }[line]}
              selected={attackLine === line}
              onClick={() => setAttackLine(line)}
            />
          ))}
        </div>
      </Section>
      <Section label="进攻结果">
        <div className="grid grid-cols-2 gap-2">
          {resultOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={result === opt.value}
              onClick={() => setResult(opt.value)}
              color={opt.color}
              prominent={opt.prominent}
            />
          ))}
        </div>
      </Section>
      <SubmitButton disabled={!(opponentBlock && attackLine && result)} onClick={handleSubmit} />
    </div>
  );
}

function BlockDefensePanel({
  mode,
  onSubmit,
}: {
  mode: string;
  onSubmit: (action: BlockDefenseAction) => void;
}) {
  const [blockEffect, setBlockEffect] = useState<BlockEffect | null>(null);
  const [defenseEffect, setDefenseEffect] = useState<DefenseEffect | null>(null);
  const [finalEffect, setFinalEffect] = useState<FinalEffect | null>(null);

  const isOwnMode = mode === 'own';
  const resultLabel = isOwnMode ? '最终效果' : '拦防结果';

  const handleSubmit = () => {
    if (!blockEffect || !defenseEffect || !finalEffect) return;
    onSubmit({
      id: uuid(),
      type: 'block_defense',
      sequenceOrder: 0,
      blockEffect,
      defenseEffect,
      finalEffect,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">拦防记录</h2>

      {/* 拦防结果 —— 两个模式都有，放最前面 */}
      <Section label={`${resultLabel}（必选）`}>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="得分" selected={finalEffect === 'score'} onClick={() => setFinalEffect('score')} color="emerald" prominent />
          <Chip label="丢分" selected={finalEffect === 'concede'} onClick={() => setFinalEffect('concede')} color="red" prominent />
          <Chip label="往返继续" selected={finalEffect === 'rally_continues'} onClick={() => setFinalEffect('rally_continues')} />
        </div>
      </Section>

      <Section label="拦网效果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="拦死" selected={blockEffect === 'block_kill'} onClick={() => setBlockEffect('block_kill')} color="emerald" />
          <Chip label="有效撑起" selected={blockEffect === 'effective_touch'} onClick={() => setBlockEffect('effective_touch')} color="emerald" />
          <Chip label="破坏性拦网" selected={blockEffect === 'destructive'} onClick={() => setBlockEffect('destructive')} color="amber" />
          <Chip label="未触球" selected={blockEffect === 'no_touch'} onClick={() => setBlockEffect('no_touch')} />
        </div>
      </Section>

      <Section label="防守效果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="到位" selected={defenseEffect === 'in_position'} onClick={() => setDefenseEffect('in_position')} color="emerald" />
          <Chip label="不到位" selected={defenseEffect === 'out_of_position'} onClick={() => setDefenseEffect('out_of_position')} color="amber" />
          <Chip label="未防起" selected={defenseEffect === 'not_dug'} onClick={() => setDefenseEffect('not_dug')} color="red" />
          <Chip label="未触球" selected={defenseEffect === 'no_touch'} onClick={() => setDefenseEffect('no_touch')} />
        </div>
      </Section>

      <SubmitButton
        disabled={!(blockEffect && defenseEffect && finalEffect)}
        onClick={handleSubmit}
      />
    </div>
  );
}

function TransitionPanel({
  onSubmit,
}: {
  onSubmit: (action: TransitionAction) => void;
}) {
  const [blockProtection, setBlockProtection] = useState<BlockProtection | null>(null);
  const [secondTouchQuality, setSecondTouchQuality] = useState<SecondTouchQuality | null>(null);

  const handleSubmit = () => {
    if (!blockProtection || !secondTouchQuality) return;
    onSubmit({ id: uuid(), type: 'transition', sequenceOrder: 0, blockProtection, secondTouchQuality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">串联记录</h2>
      <Section label="拦回保护情况">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="保护成功" selected={blockProtection === 'successful'} onClick={() => setBlockProtection('successful')} color="emerald" />
          <Chip label="保护未成功" selected={blockProtection === 'failed'} onClick={() => setBlockProtection('failed')} color="red" />
          <Chip label="未保护" selected={blockProtection === 'not_attempted'} onClick={() => setBlockProtection('not_attempted')} />
        </div>
      </Section>
      <Section label="第二下触球到位情况">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={secondTouchQuality === 'in_position'} onClick={() => setSecondTouchQuality('in_position')} color="emerald" />
          <Chip label="半到位" selected={secondTouchQuality === 'half'} onClick={() => setSecondTouchQuality('half')} color="amber" />
          <Chip label="不到位" selected={secondTouchQuality === 'out_of_position'} onClick={() => setSecondTouchQuality('out_of_position')} color="red" />
        </div>
      </Section>
      <SubmitButton disabled={!(blockProtection && secondTouchQuality)} onClick={handleSubmit} />
    </div>
  );
}

function RallyCompletePanel({
  outcome,
  ourScore,
  opponentScore,
  onNext,
  onUndo,
}: {
  outcome: RallyOutcome;
  ourScore: number;
  opponentScore: number;
  onNext: () => void;
  onUndo: () => void;
}) {
  const delta = outcome === 'our_score';
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-xl font-bold">回合结束</h2>
      <div className={`text-5xl font-black ${delta ? 'text-emerald-400' : 'text-red-400'}`}>
        {delta ? '得分!' : '丢分'}
      </div>
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center gap-6 text-4xl font-bold">
          <span className={delta ? 'text-emerald-400' : ''}>{ourScore}</span>
          <span className="text-slate-500">:</span>
          <span className={!delta ? 'text-red-400' : ''}>{opponentScore}</span>
        </div>
      </div>
      <div className="space-y-3">
        <button
          onClick={onNext}
          className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700"
        >
          下一回合
        </button>
        <button
          onClick={onUndo}
          className="w-full touch-target text-slate-400 text-sm py-2 active:text-slate-300 flex items-center justify-center gap-1"
        >
          <Undo2 className="w-4 h-4" />
          撤销上一步
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Shared mini-components
// ============================================================

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-2 font-medium">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
  color,
  prominent,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
  prominent?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: selected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300',
    red: selected ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300',
    amber: selected ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300',
    slate: selected ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-300',
  };

  return (
    <button
      onClick={onClick}
      className={`touch-target rounded-lg text-base font-medium transition-all py-3 px-2 min-h-touch
        ${selected ? 'bg-primary-600 text-white scale-95' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}
        ${color ? colorMap[color] || '' : ''}
        ${prominent && selected ? 'ring-2 ring-white' : ''}
      `}
    >
      {label}
    </button>
  );
}

function PlayerGrid({
  players,
  selected,
  onSelect,
}: {
  players: number[];
  selected: number | null;
  onSelect: (n: number) => void;
}) {
  if (players.length === 0) {
    return <p className="text-slate-500 text-sm">没有预设球员号码</p>;
  }

  return (
    <div className="grid grid-cols-5 gap-2">
      {players.map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={`touch-target rounded-lg text-lg font-bold transition-all min-h-12
            ${selected === n
              ? 'bg-primary-600 text-white scale-95'
              : 'bg-slate-800 text-slate-200 active:bg-slate-700'
            }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ZonePicker({
  selected,
  onSelect,
}: {
  selected: CourtZone | null;
  onSelect: (z: CourtZone) => void;
}) {
  const zones: { zone: CourtZone; label: string }[] = [
    { zone: 4, label: '4' },
    { zone: 3, label: '3' },
    { zone: 2, label: '2' },
    { zone: 5, label: '5' },
    { zone: 6, label: '6' },
    { zone: 1, label: '1' },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {zones.map(({ zone, label }) => (
          <button
            key={zone}
            onClick={() => onSelect(zone)}
            className={`touch-target rounded-xl text-xl font-bold transition-all py-5 min-h-16
              ${selected === zone
                ? 'bg-primary-600 text-white scale-95 ring-2 ring-primary-300'
                : 'bg-slate-800 text-slate-300 active:bg-slate-700'
              }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl">{label}</span>
              <span className="text-xs text-slate-400 mt-0.5">{zone}号位</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmitButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4
        active:bg-primary-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
    >
      确认
    </button>
  );
}

// ============================================================
// Main Recording Page
// ============================================================

export function SetRecordingPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const store = useRecordingStore();

  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    if (!matchId || !setId) return;

    // 先重置 store 确保干净状态
    store.reset();

    // 加载比赛信息
    getMatch(matchId).then((m) => {
      if (!m) { navigate('/'); return; }

      // 查找或创建当前局
      const existingSet = m.sets.find((s) => s.id === setId);
      if (existingSet) {
        // 加载已有回合
        db.rallies.where('setId').equals(setId).toArray().then((rallies) => {
          // 先初始化 store，再设置 match 触发渲染
          store.startRecording(
            matchId, setId, m.type,
            existingSet.setNumber,
            existingSet.ourScore,
            existingSet.opponentScore,
            rallies,
          );
          setMatch(m);
        });
      } else {
        store.startRecording(matchId, setId, m.type, m.sets.length + 1, 0, 0, []);
        setMatch(m);
      }
    });
  }, [matchId, setId]);

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>
    );
  }

  const playerNumbers = match.players.map((p: any) => p.jerseyNumber);
  const { currentStep, currentSide, ourScore, opponentScore, setNumber, pendingActions, completedRallies, mode } = store;

  // 判断当前步骤并渲染对应的 Panel
  const renderStep = () => {
    if (!currentStep) {
      // 还没选发球/接发
      return <ServeChoicePanel onSelect={(side) => store.startRally(side)} />;
    }

    switch (currentStep.kind) {
      case 'serve':
        return (
          <ServePanel
            mode={mode}
            players={playerNumbers}
            onSubmit={(action) => {
              store.recordAction(action);
              const terminal = isServeTerminal(action.result);
              const outcome: RallyOutcome = action.result === 'ace' ? 'our_score' : 'their_score';
              store.advanceStep({ isTerminal: terminal, outcome: terminal ? outcome : undefined });
              if (terminal) {
                store.completeRally(outcome);
              }
            }}
          />
        );

      case 'reception':
        return (
          <ReceptionPanel
            players={playerNumbers}
            onSubmit={(action) => {
              store.recordAction(action);
              store.advanceStep({ isTerminal: false });
            }}
          />
        );

      case 'set':
        return (
          <SetPanel
            players={playerNumbers}
            onSubmit={(action) => {
              store.recordAction(action);
              store.advanceStep({ isTerminal: false });
            }}
          />
        );

      case 'attack':
        return (
          <AttackPanel
            mode={mode}
            onSubmit={(action) => {
              store.recordAction(action);
              const terminal = isAttackTerminal(action.result);
              const outcome: RallyOutcome = action.result === 'score' ? 'our_score' : 'their_score';
              store.advanceStep({ isTerminal: terminal, outcome: terminal ? outcome : undefined });
              if (terminal) {
                store.completeRally(outcome);
              }
            }}
          />
        );

      case 'block_defense':
        return (
          <BlockDefensePanel
            mode={mode}
            onSubmit={(action) => {
              store.recordAction(action);
              // 两个模式都靠 finalEffect 判断是否终结
              const isTerminal = isFinalEffectTerminal(action.finalEffect!);
              let outcome: RallyOutcome | undefined;
              if (isTerminal) {
                outcome = action.finalEffect === 'score' ? 'our_score' : 'their_score';
              }

              store.advanceStep({ isTerminal, outcome });
              if (isTerminal && outcome) {
                store.completeRally(outcome);
              }
            }}
          />
        );

      case 'transition':
        return (
          <TransitionPanel
            onSubmit={(action) => {
              store.recordAction(action);
              store.advanceStep({ isTerminal: false });
            }}
          />
        );

      case 'rally_complete':
        // 从最后一次 action 判断得分方
        const lastAction = pendingActions[pendingActions.length - 1];
        let rallyOutcome: RallyOutcome = 'our_score';

        if (lastAction) {
          if (lastAction.type === 'serve') {
            rallyOutcome = lastAction.result === 'ace' ? 'our_score' : 'their_score';
          } else if (lastAction.type === 'attack') {
            rallyOutcome = lastAction.result === 'score' ? 'our_score' : 'their_score';
          } else if (lastAction.type === 'block_defense' && lastAction.finalEffect) {
            rallyOutcome = lastAction.finalEffect === 'score' ? 'our_score' : 'their_score';
          }
        }

        return (
          <RallyCompletePanel
            outcome={rallyOutcome}
            ourScore={ourScore + (rallyOutcome === 'our_score' ? 1 : 0)}
            opponentScore={opponentScore + (rallyOutcome === 'their_score' ? 1 : 0)}
            onNext={() => {
              store.completeRally(rallyOutcome);
            }}
            onUndo={() => {
              store.undoLastAction();
            }}
          />
        );

      case 'rally_start':
        return <ServeChoicePanel onSelect={(side) => store.startRally(side)} />;

      default:
        return <ServeChoicePanel onSelect={(side) => store.startRally(side)} />;
    }
  };

  const exchangeInfo = currentStep && currentStep.kind !== 'rally_start' && currentStep.kind !== 'rally_complete'
    ? (currentStep.exchangeNumber > 0 ? `往返 #${currentStep.exchangeNumber}` : '首次进攻')
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => {
          if (confirm('确定退出当前局吗？未保存的回合可能丢失。')) {
            store.reset();
            navigate(`/match/${matchId}`);
          }
        }} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-0.5">
            <span className={`px-2 py-0.5 rounded-full ${mode === 'own' ? 'bg-primary-900 text-primary-300' : 'bg-amber-900 text-amber-300'}`}>
              {mode === 'own' ? '己方分析' : '对手分析'}
            </span>
            <span className="truncate max-w-[120px]">{match.homeTeamName}</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <span className="text-2xl font-black">{ourScore}</span>
            <span className="text-sm text-slate-400">
              第{setNumber}局 · {completedRallies.length}分
            </span>
            <span className="text-2xl font-black">{opponentScore}</span>
          </div>
          {exchangeInfo && (
            <p className="text-xs text-primary-400 mt-0.5">{exchangeInfo}</p>
          )}
        </div>
      </div>

      {/* Action Progress */}
      {pendingActions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {pendingActions.map((a, i) => {
            const labels: Record<string, string> = {
              serve: '发', reception: '接', set: '传', attack: '攻', block_defense: '拦', transition: '串',
            };
            return (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {labels[a.type]}
              </span>
            );
          })}
          <span className="text-xs text-primary-400 animate-pulse">●</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {renderStep()}
      </div>

      {/* Bottom Actions */}
      <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <button
          onClick={() => store.undoLastAction()}
          disabled={pendingActions.length === 0}
          className="touch-target flex-1 text-slate-400 text-sm py-2 disabled:opacity-30
            active:text-slate-300 flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          撤销
        </button>
        <button
          onClick={async () => {
            if (confirm('确定结束这一局吗？')) {
              await store.finishSet(setId!);
              navigate(`/match/${matchId}/set/${setId}/stats`);
            }
          }}
          className="touch-target flex-1 text-amber-400 text-sm py-2
            active:text-amber-300 flex items-center justify-center gap-1"
        >
          <Flag className="w-4 h-4" />
          结束本局
        </button>
        <button
          onClick={() => {
            store.cancelRally();
          }}
          className="touch-target flex-1 text-red-400 text-sm py-2
            active:text-red-300 flex items-center justify-center gap-1"
        >
          取消回合
        </button>
      </div>
    </div>
  );
}
