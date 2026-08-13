// ============================================================
// SetRecordingPage — 实时记录向导（重构版）
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Flag, ChevronLeft } from 'lucide-react';
import { useRecordingStore } from '@/stores/recording-store';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import type { RallySide } from '@/types';
import type {
  RallyAction, ServeAction, ReceptionAction, SetAction,
  AttackAction, BlockDefenseTransitionAction,
  ServeType, CourtZone, ServeResult, ReceptionQuality, SetQuality,
  TouchQuality, AttackType, AttackLine, OpponentBlock, AttackResult,
  BlockEffect, TransitionResult,
} from '@/types';
import {
  SERVE_TYPE_LABELS, COURT_ZONE_LABELS, SERVE_RESULT_LABELS,
  RECEPTION_QUALITY_LABELS, SET_QUALITY_LABELS, TOUCH_QUALITY_LABELS,
  ATTACK_TYPE_LABELS, ATTACK_LINE_LABELS, ATTACK_RESULT_LABELS,
  BLOCK_EFFECT_LABELS, TRANSITION_RESULT_LABELS,
} from '@/types/actions';
import { STEP_LABELS } from '@/wizard/step-resolver';
import { v4 as uuid } from 'uuid';

// ============================================================
// 共享小组件
// ============================================================

function Section({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-2 font-medium">
        {label}{optional && <span className="text-slate-600 text-xs ml-1">(可选)</span>}
      </p>
      {children}
    </div>
  );
}

function Chip({
  label, selected, onClick, color, prominent,
}: {
  label: string; selected: boolean; onClick: () => void; color?: string; prominent?: boolean;
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
        ${prominent && selected ? 'ring-2 ring-white' : ''}`}
    >
      {label}
    </button>
  );
}

function PlayerGrid({ players, selected, onSelect }: { players: number[]; selected?: number; onSelect: (n: number) => void }) {
  if (players.length === 0) return <p className="text-slate-500 text-sm">无球员数据</p>;
  return (
    <div className="grid grid-cols-5 gap-2">
      {players.map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={`touch-target rounded-lg text-lg font-bold transition-all min-h-12
            ${selected === n ? 'bg-primary-600 text-white scale-95' : 'bg-slate-800 text-slate-200 active:bg-slate-700'}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ZonePicker({ selected, onSelect }: { selected?: CourtZone; onSelect: (z: CourtZone) => void }) {
  const zones: CourtZone[] = [4, 3, 2, 5, 6, 1];
  return (
    <div className="grid grid-cols-3 gap-2">
      {zones.map((z) => (
        <button
          key={z}
          onClick={() => onSelect(z)}
          className={`touch-target rounded-xl text-xl font-bold transition-all py-5 min-h-16
            ${selected === z ? 'bg-primary-600 text-white scale-95 ring-2 ring-primary-300' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}`}
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl">{z}</span>
            <span className="text-xs text-slate-400 mt-0.5">{COURT_ZONE_LABELS[z]}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function BackButton({ onBack, show }: { onBack: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      onClick={onBack}
      className="touch-target flex items-center gap-1 text-slate-400 text-sm py-2 active:text-slate-300"
    >
      <ChevronLeft className="w-4 h-4" />
      返回上一环节
    </button>
  );
}

// ============================================================
// 回合开始面板
// ============================================================

function RallyStartPanel({ nextSide, onStart, onManual }: {
  nextSide: RallySide | null;
  onStart: (side: RallySide) => void;
  onManual: () => void;
}) {
  const [manual, setManual] = useState(false);

  const showManual = manual || !nextSide;

  if (showManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">谁发球？</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onStart('serving')} className="touch-target bg-primary-600 rounded-xl py-8 text-center active:bg-primary-700">
            <div className="text-3xl mb-2">🏐</div>
            <div className="text-lg font-bold">我方发球</div>
          </button>
          <button onClick={() => onStart('receiving')} className="touch-target bg-slate-700 rounded-xl py-8 text-center active:bg-slate-600">
            <div className="text-3xl mb-2">🛡️</div>
            <div className="text-lg font-bold">对方发球</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center">下一回合</h2>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">自动判断（上回合得分→发球，丢分→接发）</p>
        <p className="text-lg font-bold">{nextSide === 'serving' ? '🏐 我方发球' : '🛡️ 我方接发'}</p>
      </div>
      <button onClick={() => onStart(nextSide!)} className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700">
        开始这一回合
      </button>
      <button onClick={() => setManual(true)} className="w-full touch-target text-slate-400 text-sm py-1">
        手动重新选择
      </button>
    </div>
  );
}

// ============================================================
// 各环节面板
// ============================================================

function ServePanel({ initial, onCommit, onBack, canBack }: {
  initial?: ServeAction;
  onCommit: (a: ServeAction) => void;
  onBack: () => void;
  canBack: boolean;
}) {
  const [playerNumber, setPlayerNumber] = useState<number | undefined>(initial?.playerNumber);
  const [serveType, setServeType] = useState<ServeType | null>(initial?.serveType ?? null);
  const [landingZone, setLandingZone] = useState<CourtZone | undefined>(initial?.landingZone);
  const [targeted, setTargeted] = useState<boolean | undefined>(initial?.targetedPlayer);
  const [result, setResult] = useState<ServeResult | null>(initial?.result ?? null);

  const canSubmit = serveType && result;

  const submit = () => {
    if (!canSubmit) return;
    onCommit({
      id: uuid(), type: 'serve', sequenceOrder: 0,
      playerNumber, serveType, landingZone, targetedPlayer: targeted, result,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">发球</h2>
      <Section label="发球球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={playerNumber} onSelect={setPlayerNumber} />
      </Section>
      <Section label="发球方式">
        <div className="grid grid-cols-2 gap-2">
          {(['jump', 'float'] as ServeType[]).map((t) => (
            <Chip key={t} label={SERVE_TYPE_LABELS[t]} selected={serveType === t} onClick={() => setServeType(t)} />
          ))}
        </div>
      </Section>
      <Section label="发球落点" optional>
        <ZonePicker selected={landingZone} onSelect={setLandingZone} />
      </Section>
      <Section label="是否发到追发人" optional>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="是" selected={targeted === true} onClick={() => setTargeted(true)} color="emerald" />
          <Chip label="否" selected={targeted === false} onClick={() => setTargeted(false)} color="slate" />
          <Chip label="未知" selected={targeted === undefined} onClick={() => setTargeted(undefined)} />
        </div>
      </Section>
      <Section label="发球结果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="对方到位" selected={result === 'in_position'} onClick={() => setResult('in_position')} />
          <Chip label="对方不到位" selected={result === 'out_of_position'} onClick={() => setResult('out_of_position')} color="amber" />
          <Chip label="得分" selected={result === 'score'} onClick={() => setResult('score')} color="emerald" prominent />
          <Chip label="丢分" selected={result === 'concede'} onClick={() => setResult('concede')} color="red" prominent />
        </div>
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <button onClick={submit} disabled={!canSubmit}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40">
        确认
      </button>
    </div>
  );
}

function ReceptionPanel({ initial, onCommit, onBack, canBack }: {
  initial?: ReceptionAction;
  onCommit: (a: ReceptionAction) => void;
  onBack: () => void;
  canBack: boolean;
}) {
  const [playerNumber, setPlayerNumber] = useState<number | undefined>(initial?.playerNumber);
  const [position, setPosition] = useState<CourtZone | undefined>(initial?.position);
  const [quality, setQuality] = useState<ReceptionQuality | null>(initial?.quality ?? null);

  const submit = () => {
    if (!quality) return;
    onCommit({ id: uuid(), type: 'reception', sequenceOrder: 0, playerNumber, position, quality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">一传</h2>
      <Section label="接一传球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={playerNumber} onSelect={setPlayerNumber} />
      </Section>
      <Section label="接球位置" optional>
        <ZonePicker selected={position} onSelect={setPosition} />
      </Section>
      <Section label="接球到位程度">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="不到位" selected={quality === 'out'} onClick={() => setQuality('out')} color="red" />
          <Chip label="半到位" selected={quality === 'half'} onClick={() => setQuality('half')} color="amber" />
          <Chip label="到位" selected={quality === 'in'} onClick={() => setQuality('in')} color="emerald" />
          <Chip label="接到对面" selected={quality === 'to_opponent'} onClick={() => setQuality('to_opponent')} />
          <Chip label="丢分" selected={quality === 'concede'} onClick={() => setQuality('concede')} color="red" prominent />
          <Chip label="得分" selected={quality === 'score'} onClick={() => setQuality('score')} color="emerald" prominent />
        </div>
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <button onClick={submit} disabled={!quality}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40">
        确认
      </button>
    </div>
  );
}

function SetPanel({ initial, onCommit, onBack, canBack }: {
  initial?: SetAction;
  onCommit: (a: SetAction) => void;
  onBack: () => void;
  canBack: boolean;
}) {
  const [positionTo, setPositionTo] = useState<CourtZone | undefined>(initial?.positionTo);
  const [attackerNumber, setAttackerNumber] = useState<number | undefined>(initial?.attackerNumber);
  const [quality, setQuality] = useState<SetQuality | null>(initial?.quality ?? null);

  const submit = () => {
    if (!quality) return;
    onCommit({ id: uuid(), type: 'set', sequenceOrder: 0, positionTo, attackerNumber, quality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">二传（一攻）</h2>
      <Section label="传给几号位" optional>
        <ZonePicker selected={positionTo} onSelect={setPositionTo} />
      </Section>
      <Section label="进攻球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={attackerNumber} onSelect={setAttackerNumber} />
      </Section>
      <Section label="是否到位">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={quality === 'in'} onClick={() => setQuality('in')} color="emerald" />
          <Chip label="半到位" selected={quality === 'half'} onClick={() => setQuality('half')} color="amber" />
          <Chip label="不到位" selected={quality === 'out'} onClick={() => setQuality('out')} color="red" />
          <Chip label="丢分" selected={quality === 'concede'} onClick={() => setQuality('concede')} color="red" prominent />
          <Chip label="得分" selected={quality === 'score'} onClick={() => setQuality('score')} color="emerald" prominent />
        </div>
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <button onClick={submit} disabled={!quality}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40">
        确认
      </button>
    </div>
  );
}

function AttackPanel({ initial, attackNumber, onCommit, onBack, canBack }: {
  initial?: AttackAction;
  attackNumber: number;
  onCommit: (a: AttackAction) => void;
  onBack: () => void;
  canBack: boolean;
}) {
  const [setQuality, setSetQuality] = useState<TouchQuality | undefined>(initial?.setQuality);
  const [opponentBlock, setOpponentBlock] = useState<OpponentBlock | undefined>(initial?.opponentBlock);
  const [attackType, setAttackType] = useState<AttackType | undefined>(initial?.attackType);
  const [attackLine, setAttackLine] = useState<AttackLine | undefined>(initial?.attackLine);
  const [result, setResult] = useState<AttackResult | null>(initial?.result ?? null);

  const submit = () => {
    if (!result) return;
    onCommit({
      id: uuid(), type: 'attack', sequenceOrder: 0,
      attackNumber, setQuality, opponentBlock, attackType, attackLine, result,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">进攻</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-900 text-primary-300">
          第 {attackNumber} 次进攻
        </span>
      </div>
      <Section label="传球是否到位" optional>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={setQuality === 'in'} onClick={() => setSetQuality('in')} color="emerald" />
          <Chip label="半到位" selected={setQuality === 'half'} onClick={() => setSetQuality('half')} color="amber" />
          <Chip label="不到位" selected={setQuality === 'out'} onClick={() => setSetQuality('out')} color="red" />
        </div>
      </Section>
      <Section label="对方拦网形成情况" optional>
        <div className="grid grid-cols-2 gap-2">
          <Chip label="形成" selected={opponentBlock === 'formed'} onClick={() => setOpponentBlock('formed')} />
          <Chip label="未形成" selected={opponentBlock === 'not_formed'} onClick={() => setOpponentBlock('not_formed')} color="emerald" />
        </div>
      </Section>
      <Section label="进攻方式" optional>
        <div className="grid grid-cols-3 gap-2">
          {(['attack', 'tip', 'handle'] as AttackType[]).map((t) => (
            <Chip key={t} label={ATTACK_TYPE_LABELS[t]} selected={attackType === t} onClick={() => setAttackType(t)} />
          ))}
        </div>
      </Section>
      <Section label="进攻线路" optional>
        <div className="grid grid-cols-3 gap-2">
          {(['middle', 'cross', 'big_cross', 'small_cross', 'second_straight', 'straight'] as AttackLine[]).map((l) => (
            <Chip key={l} label={ATTACK_LINE_LABELS[l]} selected={attackLine === l} onClick={() => setAttackLine(l)} />
          ))}
        </div>
      </Section>
      <Section label="进攻结果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="得分" selected={result === 'score'} onClick={() => setResult('score')} color="emerald" prominent />
          <Chip label="丢分" selected={result === 'concede'} onClick={() => setResult('concede')} color="red" prominent />
          <Chip label="拦回" selected={result === 'blocked_back'} onClick={() => setResult('blocked_back')} color="amber" />
          <Chip label="对方处理" selected={result === 'opponent_handled'} onClick={() => setResult('opponent_handled')} />
          <Chip label="对方形成反击" selected={result === 'opponent_counter'} onClick={() => setResult('opponent_counter')} />
        </div>
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <button onClick={submit} disabled={!result}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40">
        确认
      </button>
    </div>
  );
}

function BlockDefenseTransitionPanel({ initial, onCommit, onBack, canBack }: {
  initial?: BlockDefenseTransitionAction;
  onCommit: (a: BlockDefenseTransitionAction) => void;
  onBack: () => void;
  canBack: boolean;
}) {
  const [blockEffect, setBlockEffect] = useState<BlockEffect | undefined>(initial?.blockEffect);
  const [firstTouch, setFirstTouch] = useState<TouchQuality | undefined>(initial?.firstTouch);
  const [secondTouch, setSecondTouch] = useState<TouchQuality | undefined>(initial?.secondTouch);
  const [thirdPos, setThirdPos] = useState<CourtZone | undefined>(initial?.thirdTouchPosition);
  const [thirdPlayer, setThirdPlayer] = useState<number | undefined>(initial?.thirdTouchPlayer);
  const [result, setResult] = useState<TransitionResult | null>(initial?.result ?? null);

  const submit = () => {
    if (!result) return;
    onCommit({
      id: uuid(), type: 'block_defense_transition', sequenceOrder: 0,
      blockEffect, firstTouch, secondTouch, thirdTouchPosition: thirdPos, thirdTouchPlayer: thirdPlayer, result,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">拦防串联</h2>
      <Section label="拦网效果" optional>
        <div className="grid grid-cols-2 gap-2">
          <Chip label="拦死" selected={blockEffect === 'block_kill'} onClick={() => setBlockEffect('block_kill')} color="emerald" />
          <Chip label="有效撑起" selected={blockEffect === 'effective_touch'} onClick={() => setBlockEffect('effective_touch')} color="emerald" />
          <Chip label="破坏性拦网" selected={blockEffect === 'destructive'} onClick={() => setBlockEffect('destructive')} color="amber" />
          <Chip label="未有效触球" selected={blockEffect === 'no_effective_touch'} onClick={() => setBlockEffect('no_effective_touch')} />
          <Chip label="打手出界" selected={blockEffect === 'block_out'} onClick={() => setBlockEffect('block_out')} color="amber" />
          <Chip label="无（进攻拦回）" selected={blockEffect === 'none'} onClick={() => setBlockEffect('none')} />
        </div>
      </Section>
      <Section label="第一次触球效果" optional>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={firstTouch === 'in'} onClick={() => setFirstTouch('in')} color="emerald" />
          <Chip label="半到位" selected={firstTouch === 'half'} onClick={() => setFirstTouch('half')} color="amber" />
          <Chip label="不到位" selected={firstTouch === 'out'} onClick={() => setFirstTouch('out')} color="red" />
          <Chip label="丢分" selected={firstTouch === 'concede'} onClick={() => setFirstTouch('concede')} color="red" prominent />
          <Chip label="得分" selected={firstTouch === 'score'} onClick={() => setFirstTouch('score')} color="emerald" prominent />
        </div>
      </Section>
      <Section label="第二次触球效果" optional>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="到位" selected={secondTouch === 'in'} onClick={() => setSecondTouch('in')} color="emerald" />
          <Chip label="半到位" selected={secondTouch === 'half'} onClick={() => setSecondTouch('half')} color="amber" />
          <Chip label="不到位" selected={secondTouch === 'out'} onClick={() => setSecondTouch('out')} color="red" />
          <Chip label="丢分" selected={secondTouch === 'concede'} onClick={() => setSecondTouch('concede')} color="red" prominent />
          <Chip label="得分" selected={secondTouch === 'score'} onClick={() => setSecondTouch('score')} color="emerald" prominent />
        </div>
      </Section>
      <Section label="第三次触球位置" optional>
        <ZonePicker selected={thirdPos} onSelect={setThirdPos} />
      </Section>
      <Section label="第三次触球球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={thirdPlayer} onSelect={setThirdPlayer} />
      </Section>
      <Section label="串联结果">
        <div className="grid grid-cols-2 gap-2">
          <Chip label="形成进攻" selected={result === 'form_attack'} onClick={() => setResult('form_attack')} />
          <Chip label="处理" selected={result === 'handle'} onClick={() => setResult('handle')} color="amber" />
          <Chip label="得分" selected={result === 'score'} onClick={() => setResult('score')} color="emerald" prominent />
          <Chip label="丢分" selected={result === 'concede'} onClick={() => setResult('concede')} color="red" prominent />
        </div>
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <button onClick={submit} disabled={!result}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40">
        确认
      </button>
    </div>
  );
}

// ============================================================
// 全局球员号码（由页面传入）
// ============================================================

let _playerNumbers: number[] = [];
function playerNumbers(): number[] { return _playerNumbers; }

// ============================================================
// 主页面
// ============================================================

export function SetRecordingPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const store = useRecordingStore();
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    if (!matchId || !setId) return;
    store.reset();
    getMatch(matchId).then((m) => {
      if (!m) { navigate('/'); return; }
      const existingSet = m.sets.find((s: any) => s.id === setId);
      if (existingSet) {
        db.rallies.where('setId').equals(setId).toArray().then((rallies) => {
          store.startRecording(matchId, setId, m.type, existingSet.setNumber, existingSet.ourScore, existingSet.opponentScore, rallies);
          setMatch(m);
        });
      } else {
        store.startRecording(matchId, setId, m.type, m.sets.length + 1, 0, 0, []);
        setMatch(m);
      }
    });
  }, [matchId, setId]);

  if (!match) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  _playerNumbers = match.players.map((p: any) => p.jerseyNumber).sort((a: number, b: number) => a - b);

  const { currentStep, currentSide, nextSide, editingAction, pendingActions, ourScore, opponentScore, setNumber, completedRallies, mode } = store;

  // 计算进攻次数
  const attackCount = pendingActions.filter((a) => a.type === 'attack').length;
  const attackNumber = currentSide === 'serving' ? attackCount + 2 : attackCount + 1;

  const renderStep = () => {
    if (!currentStep) {
      return (
        <RallyStartPanel
          nextSide={nextSide}
          onStart={(side) => store.startRally(side)}
          onManual={() => store.startRally('serving')}
        />
      );
    }

    const canBack = pendingActions.length > 0;

    switch (currentStep) {
      case 'serve':
        return <ServePanel initial={editingAction as ServeAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'reception':
        return <ReceptionPanel initial={editingAction as ReceptionAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'set':
        return <SetPanel initial={editingAction as SetAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'attack':
        return <AttackPanel initial={editingAction as AttackAction} attackNumber={attackNumber} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'block_defense_transition':
        return <BlockDefenseTransitionPanel initial={editingAction as BlockDefenseTransitionAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => {
          if (pendingActions.length > 0 && confirm('当前回合未完成，确定退出吗？')) {
            store.reset(); navigate(`/match/${matchId}`);
          } else if (pendingActions.length === 0) {
            store.reset(); navigate(`/match/${matchId}`);
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
            <span className="text-sm text-slate-400">第{setNumber}局 · {completedRallies.length}分</span>
            <span className="text-2xl font-black">{opponentScore}</span>
          </div>
        </div>
      </div>

      {/* 当前回合动作进度 */}
      {pendingActions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/50">
          {pendingActions.map((a, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              {STEP_LABELS[a.type]}
            </span>
          ))}
          <span className="text-xs text-primary-400 animate-pulse">● {currentStep ? STEP_LABELS[currentStep] : ''}</span>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {renderStep()}
      </div>

      {/* 底部操作 */}
      <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <button onClick={() => store.goBack()} disabled={pendingActions.length === 0}
          className="touch-target flex-1 text-slate-400 text-sm py-2 disabled:opacity-30 active:text-slate-300 flex items-center justify-center gap-1">
          <ChevronLeft className="w-4 h-4" />返回上一环节
        </button>
        <button onClick={() => store.cancelRally()}
          className="touch-target flex-1 text-red-400 text-sm py-2 active:text-red-300 flex items-center justify-center gap-1">
          取消本回合
        </button>
        <button onClick={async () => {
          if (confirm('确定结束这一局吗？')) {
            await store.finishSet(setId!);
            navigate(`/match/${matchId}/set/${setId}/stats`);
          }
        }} className="touch-target flex-1 text-amber-400 text-sm py-2 active:text-amber-300 flex items-center justify-center gap-1">
          <Flag className="w-4 h-4" />结束本局
        </button>
      </div>
    </div>
  );
}
