// ============================================================
// SetRecordingPage — 实时记录向导（v2）
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, ChevronLeft, Plus, X } from 'lucide-react';
import { useRecordingStore } from '@/stores/recording-store';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import type { RallySide, Substitution } from '@/types';
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

let _playerNumbers: number[] = [];
function playerNumbers(): number[] { return _playerNumbers; }

// ============================================================
// 小组件
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

/** 支持双击/再点取消选择的选项按钮 */
function Chip<T extends string>({ label, value, selected, onSelect, color, prominent, columns }: {
  label: string; value: T; selected: boolean; onSelect: (v: T | null) => void;
  color?: string; prominent?: boolean; columns?: number;
}) {
  const colorMap: Record<string, string> = {
    emerald: selected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300',
    red: selected ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300',
    amber: selected ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300',
  };
  return (
    <button
      onClick={() => onSelect(selected ? null : value)}
      className={`touch-target rounded-lg text-base font-medium transition-all py-3 px-2 min-h-touch
        ${selected ? 'bg-primary-600 text-white scale-95' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}
        ${color ? colorMap[color] || '' : ''}
        ${prominent && selected ? 'ring-2 ring-white' : ''}`}
    >
      {label}
    </button>
  );
}

function ChipGrid<T extends string>({ options, selected, onSelect, columns, colorOf }: {
  options: { v: T; label: string; color?: string; prominent?: boolean }[];
  selected: T | null | undefined;
  onSelect: (v: T | null) => void;
  columns: number;
  colorOf?: (v: T) => string | undefined;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((o) => (
        <Chip key={o.v} label={o.label} value={o.v} selected={selected === o.v}
          onSelect={onSelect} color={colorOf ? colorOf(o.v) : o.color} prominent={o.prominent} />
      ))}
    </div>
  );
}

function PlayerGrid({ players, selected, onSelect }: { players: number[]; selected?: number; onSelect: (n: number | null) => void }) {
  if (players.length === 0) return <p className="text-slate-500 text-sm">无球员数据</p>;
  return (
    <div className="grid grid-cols-5 gap-2">
      {players.map((n) => (
        <button key={n} onClick={() => onSelect(selected === n ? null : n)}
          className={`touch-target rounded-lg text-lg font-bold transition-all min-h-12
            ${selected === n ? 'bg-primary-600 text-white scale-95' : 'bg-slate-800 text-slate-200 active:bg-slate-700'}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function ZonePicker({ selected, onSelect }: { selected?: CourtZone; onSelect: (z: CourtZone | null) => void }) {
  const zones: CourtZone[] = [4, 3, 2, 5, 6, 1];
  return (
    <div className="grid grid-cols-3 gap-2">
      {zones.map((z) => (
        <button key={z} onClick={() => onSelect(selected === z ? null : z)}
          className={`touch-target rounded-xl text-xl font-bold transition-all py-5 min-h-16
            ${selected === z ? 'bg-primary-600 text-white scale-95 ring-2 ring-primary-300' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}`}>
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
    <button onClick={onBack} className="touch-target flex items-center gap-1 text-slate-400 text-sm py-2 active:text-slate-300">
      <ChevronLeft className="w-4 h-4" />返回上一环节
    </button>
  );
}

function SubmitButton({ disabled, onClick, label = '确认' }: { disabled: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700 disabled:opacity-40 disabled:pointer-events-none">
      {label}
    </button>
  );
}

// ============================================================
// 回合开始 / 完成面板
// ============================================================

function RallyStartPanel({ nextSide, onStart }: { nextSide: RallySide | null; onStart: (side: RallySide) => void }) {
  const [manual, setManual] = useState(false);
  const showManual = manual || !nextSide;

  if (showManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-center">谁发球？</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onStart('serving')} className="touch-target bg-primary-600 rounded-xl py-8 text-center active:bg-primary-700">
            <div className="text-3xl mb-2">🏐</div><div className="text-lg font-bold">我方发球</div>
          </button>
          <button onClick={() => onStart('receiving')} className="touch-target bg-slate-700 rounded-xl py-8 text-center active:bg-slate-600">
            <div className="text-3xl mb-2">🛡️</div><div className="text-lg font-bold">对方发球</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center">下一回合</h2>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">自动判断</p>
        <p className="text-lg font-bold">{nextSide === 'serving' ? '🏐 我方发球' : '🛡️ 我方接发'}</p>
      </div>
      <button onClick={() => onStart(nextSide!)} className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700">
        开始这一回合
      </button>
      <button onClick={() => setManual(true)} className="w-full touch-target text-slate-400 text-sm py-1">手动重新选择</button>
    </div>
  );
}

function RallyCompletePanel({ outcome, score, players, onFinalize, onUpdate, onBack }: {
  outcome: 'our_score' | 'their_score';
  score: { our: number; their: number };
  players: number[];
  onFinalize: (timeout: boolean, hasSubstitution: boolean, subs: Substitution[]) => void;
  onUpdate: (timeout: boolean, hasSubstitution: boolean, subs: Substitution[]) => void;
  onBack: () => void;
}) {
  const [timeoutOn, setTimeoutOn] = useState(false);
  const [subOn, setSubOn] = useState(false);
  const [subs, setSubs] = useState<Substitution[]>([]);
  const [subIn, setSubIn] = useState<number | null>(null);
  const [subOut, setSubOut] = useState<number | null>(null);

  // 实时同步暂停/换人到 store，让顶部数字立即更新
  useEffect(() => {
    onUpdate(timeoutOn, subOn, subs);
  }, [timeoutOn, subOn, subs]);

  const addSub = () => {
    if (subIn && subOut) {
      setSubs([...subs, { playerIn: subIn, playerOut: subOut }]);
      setSubIn(null); setSubOut(null);
    }
  };

  const toggle = (v: boolean, setter: (b: boolean) => void) => setter(!v);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center">回合结束</h2>
      <div className={`text-4xl font-black text-center ${outcome === 'our_score' ? 'text-emerald-400' : 'text-red-400'}`}>
        {outcome === 'our_score' ? '得分!' : '丢分'}
      </div>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-5 text-3xl font-bold">
          <span>{score.our}</span><span className="text-slate-500">:</span><span>{score.their}</span>
        </div>
      </div>

      {/* 暂停 / 换人 */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => toggle(timeoutOn, setTimeoutOn)}
          className={`touch-target rounded-xl py-4 text-base font-bold transition-all ${timeoutOn ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
          ⏱ 暂停
        </button>
        <button onClick={() => toggle(subOn, setSubOn)}
          className={`touch-target rounded-xl py-4 text-base font-bold transition-all ${subOn ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
          🔄 换人
        </button>
      </div>

      {subOn && (
        <div className="space-y-2">
          <Section label="添加换人（换上几号 / 换下几号）">
            <div className="flex gap-2 items-center">
              <select value={subIn || ''} onChange={(e) => setSubIn(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 bg-slate-800 rounded-lg px-3 py-2.5 text-white outline-none">
                <option value="">换上几号</option>
                {players.map((p) => <option key={p} value={p}>{p}号</option>)}
              </select>
              <select value={subOut || ''} onChange={(e) => setSubOut(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 bg-slate-800 rounded-lg px-3 py-2.5 text-white outline-none">
                <option value="">换下几号</option>
                {players.map((p) => <option key={p} value={p}>{p}号</option>)}
              </select>
              <button onClick={addSub} className="touch-target bg-primary-600 rounded-lg px-3 py-2.5 active:bg-primary-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </Section>
          {subs.length > 0 && (
            <div className="space-y-1.5">
              {subs.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm">
                  <span className="text-slate-200">{s.playerIn}号 换 {s.playerOut}号</span>
                  <button onClick={() => setSubs(subs.filter((_, j) => j !== i))} className="text-red-400 p-1"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={() => onFinalize(timeoutOn, subOn, subs)}
        className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4 active:bg-primary-700">
        下一回合
      </button>
      <button onClick={onBack} className="w-full touch-target text-slate-400 text-sm py-1">返回上一环节</button>
    </div>
  );
}

// ============================================================
// 各环节面板
// ============================================================

function ServePanel({ initial, onCommit, onBack, canBack }: {
  initial?: ServeAction; onCommit: (a: ServeAction) => void; onBack: () => void; canBack: boolean;
}) {
  const [playerNumber, setPlayerNumber] = useState<number | undefined>(initial?.playerNumber);
  const [serveType, setServeType] = useState<ServeType | null>(initial?.serveType ?? null);
  const [landingZone, setLandingZone] = useState<CourtZone | undefined>(initial?.landingZone);
  const [targeted, setTargeted] = useState<boolean | undefined>(initial?.targetedPlayer);
  const [result, setResult] = useState<ServeResult | null>(initial?.result ?? null);

  const submit = () => {
    if (!serveType || !result) return;
    onCommit({ id: uuid(), type: 'serve', sequenceOrder: 0, playerNumber, serveType, landingZone, targetedPlayer: targeted, result });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">发球</h2>
      <Section label="发球球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={playerNumber} onSelect={(n) => setPlayerNumber(n ?? undefined)} />
      </Section>
      <Section label="发球方式">
        <ChipGrid options={Object.entries(SERVE_TYPE_LABELS).map(([v, label]) => ({ v: v as ServeType, label }))}
          selected={serveType} onSelect={(v) => setServeType(v)} columns={2} />
      </Section>
      <Section label="发球落点" optional>
        <ZonePicker selected={landingZone} onSelect={(z) => setLandingZone(z ?? undefined)} />
      </Section>
      <Section label="是否发到追发人" optional>
        <ChipGrid options={[
          { v: 'yes' as const, label: '是', color: 'emerald' },
          { v: 'no' as const, label: '否', color: 'slate' },
          { v: 'unknown' as const, label: '未知' },
        ]} selected={targeted === undefined ? 'unknown' : targeted ? 'yes' : 'no'}
          onSelect={(v) => setTargeted(v === 'unknown' || v === null ? undefined : v === 'yes')} columns={3} />
      </Section>
      <Section label="发球结果">
        <ChipGrid options={Object.entries(SERVE_RESULT_LABELS).map(([v, label]) => ({
          v: v as ServeResult, label,
          color: v === 'score' ? 'emerald' : v === 'concede' ? 'red' : v === 'out_of_position' ? 'amber' : undefined,
          prominent: v === 'score' || v === 'concede',
        }))} selected={result} onSelect={(v) => setResult(v)} columns={2} />
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <SubmitButton disabled={!(serveType && result)} onClick={submit} />
    </div>
  );
}

function ReceptionPanel({ initial, onCommit, onBack, canBack }: {
  initial?: ReceptionAction; onCommit: (a: ReceptionAction) => void; onBack: () => void; canBack: boolean;
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
        <PlayerGrid players={playerNumbers()} selected={playerNumber} onSelect={(n) => setPlayerNumber(n ?? undefined)} />
      </Section>
      <Section label="接球位置" optional>
        <ZonePicker selected={position} onSelect={(z) => setPosition(z ?? undefined)} />
      </Section>
      <Section label="接球到位程度">
        <ChipGrid options={Object.entries(RECEPTION_QUALITY_LABELS).map(([v, label]) => ({
          v: v as ReceptionQuality, label,
          color: v === 'in' ? 'emerald' : v === 'concede' ? 'red' : (v === 'opponent_error' || v === 'direct_score') ? 'emerald' : undefined,
          prominent: v === 'concede' || v === 'opponent_error' || v === 'direct_score',
        }))} selected={quality} onSelect={(v) => setQuality(v)} columns={3} />
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <SubmitButton disabled={!quality} onClick={submit} />
    </div>
  );
}

function SetPanel({ initial, onCommit, onBack, canBack }: {
  initial?: SetAction; onCommit: (a: SetAction) => void; onBack: () => void; canBack: boolean;
}) {
  const [positionTo, setPositionTo] = useState<CourtZone | undefined>(initial?.positionTo);
  const [quality, setQuality] = useState<SetQuality | null>(initial?.quality ?? null);

  const submit = () => {
    if (!quality) return;
    onCommit({ id: uuid(), type: 'set', sequenceOrder: 0, positionTo, quality });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">二传（一攻）</h2>
      <Section label="传给几号位" optional>
        <ZonePicker selected={positionTo} onSelect={(z) => setPositionTo(z ?? undefined)} />
      </Section>
      <Section label="是否到位">
        <ChipGrid options={Object.entries(SET_QUALITY_LABELS).map(([v, label]) => ({
          v: v as SetQuality, label,
          color: v === 'in' ? 'emerald' : v === 'concede' ? 'red' : v === 'score' ? 'emerald' : undefined,
          prominent: v === 'concede' || v === 'score',
        }))} selected={quality} onSelect={(v) => setQuality(v)} columns={3} />
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <SubmitButton disabled={!quality} onClick={submit} />
    </div>
  );
}

function AttackPanel({ initial, attackNumber, onCommit, onBack, canBack }: {
  initial?: AttackAction; attackNumber: number; onCommit: (a: AttackAction) => void; onBack: () => void; canBack: boolean;
}) {
  const [setQuality, setSetQuality] = useState<TouchQuality | undefined>(initial?.setQuality);
  const [attackerNumber, setAttackerNumber] = useState<number | undefined>(initial?.attackerNumber);
  const [opponentBlock, setOpponentBlock] = useState<OpponentBlock | undefined>(initial?.opponentBlock);
  const [attackType, setAttackType] = useState<AttackType | undefined>(initial?.attackType);
  const [attackLine, setAttackLine] = useState<AttackLine | undefined>(initial?.attackLine);
  const [result, setResult] = useState<AttackResult | null>(initial?.result ?? null);

  const submit = () => {
    if (!result) return;
    onCommit({ id: uuid(), type: 'attack', sequenceOrder: 0, attackNumber, setQuality, attackerNumber, opponentBlock, attackType, attackLine, result });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">进攻</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-900 text-primary-300">第 {attackNumber} 次进攻</span>
      </div>
      <Section label="传球是否到位" optional>
        <ChipGrid options={[{ v: 'in', label: '到位', color: 'emerald' }, { v: 'half', label: '半到位', color: 'amber' }, { v: 'out', label: '不到位', color: 'red' }]}
          selected={setQuality} onSelect={(v) => setSetQuality(v ?? undefined)} columns={3} />
      </Section>
      <Section label="进攻球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={attackerNumber} onSelect={(n) => setAttackerNumber(n ?? undefined)} />
      </Section>
      <Section label="对方并拦形成情况" optional>
        <ChipGrid options={[{ v: 'formed', label: '形成' }, { v: 'not_formed', label: '未形成', color: 'emerald' }]}
          selected={opponentBlock} onSelect={(v) => setOpponentBlock(v ?? undefined)} columns={2} />
      </Section>
      <Section label="进攻方式" optional>
        <ChipGrid options={Object.entries(ATTACK_TYPE_LABELS).map(([v, label]) => ({ v: v as AttackType, label }))}
          selected={attackType} onSelect={(v) => setAttackType(v ?? undefined)} columns={4} />
      </Section>
      <Section label="进攻线路" optional>
        <ChipGrid options={Object.entries(ATTACK_LINE_LABELS).map(([v, label]) => ({ v: v as AttackLine, label }))}
          selected={attackLine} onSelect={(v) => setAttackLine(v ?? undefined)} columns={3} />
      </Section>
      <Section label="进攻结果">
        <ChipGrid options={Object.entries(ATTACK_RESULT_LABELS).map(([v, label]) => ({
          v: v as AttackResult, label,
          color: v === 'score' ? 'emerald' : (v === 'error' || v === 'blocked_kill') ? 'red' : undefined,
          prominent: v === 'score' || v === 'error' || v === 'blocked_kill',
        }))} selected={result} onSelect={(v) => setResult(v)} columns={2} />
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <SubmitButton disabled={!result} onClick={submit} />
    </div>
  );
}

function BlockDefenseTransitionPanel({ initial, onCommit, onBack, canBack }: {
  initial?: BlockDefenseTransitionAction; onCommit: (a: BlockDefenseTransitionAction) => void; onBack: () => void; canBack: boolean;
}) {
  const [oppAtkPos, setOppAtkPos] = useState<CourtZone | undefined>(initial?.opponentAttackPosition);
  const [blockEffect, setBlockEffect] = useState<BlockEffect | undefined>(initial?.blockEffect);
  const [oppAtkLand, setOppAtkLand] = useState<CourtZone | undefined>(initial?.opponentAttackLanding);
  const [firstTouchPlayer, setFirstTouchPlayer] = useState<number | undefined>(initial?.firstTouchPlayer);
  const [firstTouch, setFirstTouch] = useState<TouchQuality | undefined>(initial?.firstTouch);
  const [secondTouchPlayer, setSecondTouchPlayer] = useState<number | undefined>(initial?.secondTouchPlayer);
  const [secondTouch, setSecondTouch] = useState<TouchQuality | undefined>(initial?.secondTouch);
  const [thirdPos, setThirdPos] = useState<CourtZone | undefined>(initial?.thirdTouchPosition);
  const [thirdPlayer, setThirdPlayer] = useState<number | undefined>(initial?.thirdTouchPlayer);
  const [result, setResult] = useState<TransitionResult | null>(initial?.result ?? null);

  const submit = () => {
    if (!result) return;
    onCommit({
      id: uuid(), type: 'block_defense_transition', sequenceOrder: 0,
      opponentAttackPosition: oppAtkPos, blockEffect, opponentAttackLanding: oppAtkLand,
      firstTouchPlayer, firstTouch, secondTouchPlayer, secondTouch,
      thirdTouchPosition: thirdPos, thirdTouchPlayer: thirdPlayer, result,
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">拦防串联</h2>
      <Section label="对方进攻位置" optional>
        <ZonePicker selected={oppAtkPos} onSelect={(z) => setOppAtkPos(z ?? undefined)} />
      </Section>
      <Section label="拦网效果" optional>
        <ChipGrid options={Object.entries(BLOCK_EFFECT_LABELS).map(([v, label]) => ({ v: v as BlockEffect, label }))}
          selected={blockEffect} onSelect={(v) => setBlockEffect(v ?? undefined)} columns={2} />
      </Section>
      <Section label="对方进攻落点" optional>
        <ZonePicker selected={oppAtkLand} onSelect={(z) => setOppAtkLand(z ?? undefined)} />
      </Section>
      <Section label="第一次触球球员号" optional>
        <PlayerGrid players={playerNumbers()} selected={firstTouchPlayer} onSelect={(n) => setFirstTouchPlayer(n ?? undefined)} />
      </Section>
      <Section label="第一次触球效果" optional>
        <ChipGrid options={Object.entries(TOUCH_QUALITY_LABELS).map(([v, label]) => ({ v: v as TouchQuality, label }))}
          selected={firstTouch} onSelect={(v) => setFirstTouch(v ?? undefined)} columns={3} />
      </Section>
      <Section label="第二次触球球员号" optional>
        <PlayerGrid players={playerNumbers()} selected={secondTouchPlayer} onSelect={(n) => setSecondTouchPlayer(n ?? undefined)} />
      </Section>
      <Section label="第二次触球效果" optional>
        <ChipGrid options={Object.entries(TOUCH_QUALITY_LABELS).map(([v, label]) => ({ v: v as TouchQuality, label }))}
          selected={secondTouch} onSelect={(v) => setSecondTouch(v ?? undefined)} columns={3} />
      </Section>
      <Section label="第三次触球位置" optional>
        <ZonePicker selected={thirdPos} onSelect={(z) => setThirdPos(z ?? undefined)} />
      </Section>
      <Section label="第三次触球球员号码" optional>
        <PlayerGrid players={playerNumbers()} selected={thirdPlayer} onSelect={(n) => setThirdPlayer(n ?? undefined)} />
      </Section>
      <Section label="串联结果">
        <ChipGrid options={Object.entries(TRANSITION_RESULT_LABELS).map(([v, label]) => ({
          v: v as TransitionResult, label,
          color: v === 'score' ? 'emerald' : v === 'concede' ? 'red' : undefined,
          prominent: v === 'score' || v === 'concede',
        }))} selected={result} onSelect={(v) => setResult(v)} columns={2} />
      </Section>
      <BackButton onBack={onBack} show={canBack} />
      <SubmitButton disabled={!result} onClick={submit} />
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export function SetRecordingPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const store = useRecordingStore();
  const [match, setMatch] = useState<any>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

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

  const { currentStep, currentSide, nextSide, editingAction, pendingActions, pendingRally, ourScore, opponentScore, setNumber, completedRallies, mode } = store;

  const attackCount = pendingActions.filter((a) => a.type === 'attack').length;
  const attackNumber = currentSide === 'serving' ? attackCount + 2 : attackCount + 1;
  const canBack = pendingActions.length > 0 || currentStep === 'rally_complete';

  // 暂停/换人次数（含当前待完成回合的实时选择）
  const timeoutCount = completedRallies.filter((r) => r.timeout).length + (pendingRally?.timeout ? 1 : 0);
  const substitutionCount = completedRallies.filter((r) => r.hasSubstitution).length + (pendingRally?.hasSubstitution ? 1 : 0);

  const renderStep = () => {
    if (!currentStep) {
      return <RallyStartPanel nextSide={nextSide} onStart={(side) => store.startRally(side)} />;
    }

    if (currentStep === 'rally_complete' && pendingRally) {
      return (
        <RallyCompletePanel
          outcome={pendingRally.outcome}
          score={{ our: pendingRally.homeScoreAfter, their: pendingRally.awayScoreAfter }}
          players={_playerNumbers}
          onFinalize={(t, hs, s) => store.finalizeRally(t, hs, s)}
          onUpdate={(t, hs, s) => store.updatePendingRally(t, hs, s)}
          onBack={() => store.goBack()}
        />
      );
    }

    const key = pendingActions.length;

    switch (currentStep) {
      case 'serve':
        return <ServePanel key={key} initial={editingAction as ServeAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'reception':
        return <ReceptionPanel key={key} initial={editingAction as ReceptionAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'set':
        return <SetPanel key={key} initial={editingAction as SetAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'attack':
        return <AttackPanel key={key} initial={editingAction as AttackAction} attackNumber={attackNumber} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      case 'block_defense_transition':
        return <BlockDefenseTransitionPanel key={key} initial={editingAction as BlockDefenseTransitionAction} onCommit={(a) => store.commitAction(a)} onBack={() => store.goBack()} canBack={canBack} />;
      default:
        return null;
    }
  };

  const handleExit = () => {
    // 有未完成的回合时，需要二次点击确认
    if (pendingActions.length > 0 && !confirmExit) {
      setConfirmExit(true);
      setTimeout(() => setConfirmExit(false), 3000);
      return;
    }
    setConfirmExit(false);
    store.persistScore();
    store.reset();
    navigate(`/match/${matchId}`);
  };

  const handleEndSet = async () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3000);
      return;
    }
    setConfirmEnd(false);
    await store.finishSet(setId!);
    navigate(`/match/${matchId}/set/${setId}/stats`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-slate-800">
        <button onClick={handleExit} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
          {confirmExit && <span className="ml-1 text-xs text-red-400 font-semibold">确认退出?</span>}
        </button>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-0.5">
            <span className={`px-2 py-0.5 rounded-full ${mode === 'own' ? 'bg-primary-900 text-primary-300' : 'bg-amber-900 text-amber-300'}`}>
              {mode === 'own' ? '己方分析' : '对手分析'}
            </span>
            <span className="truncate max-w-[120px]">{match.homeTeamName}</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">暂停{timeoutCount}</span>
            <span className="text-2xl font-black">{ourScore}</span>
            <span className="text-sm text-slate-400">第{setNumber}局 · {completedRallies.length}分</span>
            <span className="text-2xl font-black">{opponentScore}</span>
            <span className="text-xs text-slate-400 whitespace-nowrap">换人{substitutionCount}</span>
          </div>
        </div>
      </div>

      {/* 进度 */}
      {pendingActions.length > 0 && currentStep !== 'rally_complete' && (
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/50">
          {pendingActions.map((a, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{STEP_LABELS[a.type]}</span>
          ))}
          <span className="text-xs text-primary-400 animate-pulse">● {currentStep ? STEP_LABELS[currentStep as keyof typeof STEP_LABELS] : ''}</span>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">{renderStep()}</div>

      {/* 底部操作 */}
      <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <button onClick={() => store.goBack()} disabled={pendingActions.length === 0 && currentStep !== 'rally_complete'}
          className="touch-target flex-1 text-slate-400 text-sm py-2 disabled:opacity-30 active:text-slate-300 flex items-center justify-center gap-1">
          <ChevronLeft className="w-4 h-4" />返回上一环节
        </button>
        <button onClick={() => store.cancelRally()} className="touch-target flex-1 text-red-400 text-sm py-2 active:text-red-300 flex items-center justify-center gap-1">
          取消本回合
        </button>
        <button onClick={handleEndSet} className={`touch-target flex-1 text-sm py-2 flex items-center justify-center gap-1 ${confirmEnd ? 'text-red-400 font-bold' : 'text-amber-400 active:text-amber-300'}`}>
          <Flag className="w-4 h-4" />{confirmEnd ? '再点一次确认结束' : '结束本局'}
        </button>
      </div>
    </div>
  );
}
