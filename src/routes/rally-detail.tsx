// ============================================================
// RallyDetailPage — 回合详情：查看/修改各环节，保存
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Pencil, Check } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import type { Rally } from '@/types';
import type {
  RallyAction, ServeAction, ReceptionAction, SetAction, AttackAction, BlockDefenseTransitionAction,
  CourtZone, ServeResult, ReceptionQuality, SetQuality, TouchQuality, AttackType, AttackLine,
  OpponentBlock, AttackResult, BlockEffect, TransitionResult,
} from '@/types';
import {
  SERVE_TYPE_LABELS, SERVE_RESULT_LABELS, RECEPTION_QUALITY_LABELS, SET_QUALITY_LABELS,
  TOUCH_QUALITY_LABELS, ATTACK_TYPE_LABELS, ATTACK_LINE_LABELS, ATTACK_RESULT_LABELS,
  BLOCK_EFFECT_LABELS, TRANSITION_RESULT_LABELS,
} from '@/types/actions';
import { formatAction } from '@/utils/action-format';
import { toast } from 'sonner';

// 通用小组件
function EditChips<T extends string>({ options, value, onChange, columns }: {
  options: { v: T; label: string }[]; value?: T; onChange: (v: T) => void; columns?: number;
}) {
  const cols = columns || 3;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`touch-target rounded-lg text-sm py-2 px-1 transition-all ${value === o.v ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EditZones({ value, onChange }: { value?: CourtZone; onChange: (z: CourtZone) => void }) {
  const zones: CourtZone[] = [4, 3, 2, 5, 6, 1];
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {zones.map((z) => (
        <button key={z} onClick={() => onChange(z)}
          className={`touch-target rounded-lg text-base font-bold py-2 ${value === z ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 active:bg-slate-700'}`}>
          {z}
        </button>
      ))}
    </div>
  );
}

function EditNumbers({ value, onChange, players }: { value?: number; onChange: (n: number) => void; players: number[] }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {players.map((n) => (
        <button key={n} onClick={() => onChange(n)}
          className={`touch-target rounded-lg text-base font-bold py-2 ${value === n ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200 active:bg-slate-700'}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function EditLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 mt-2 mb-1">{children}</p>;
}

// 各动作编辑表单
function EditServe({ a, onChange, players }: { a: ServeAction; onChange: (a: ServeAction) => void; players: number[] }) {
  return (
    <div>
      <EditLabel>发球球员</EditLabel>
      <EditNumbers value={a.playerNumber} onChange={(n) => onChange({ ...a, playerNumber: n })} players={players} />
      <EditLabel>发球方式</EditLabel>
      <EditChips options={Object.entries(SERVE_TYPE_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.serveType} onChange={(v) => onChange({ ...a, serveType: v })} columns={2} />
      <EditLabel>发球落点</EditLabel>
      <EditZones value={a.landingZone} onChange={(z) => onChange({ ...a, landingZone: z })} />
      <EditLabel>是否发到追发人</EditLabel>
      <EditChips options={[{ v: 'true', label: '是' }, { v: 'false', label: '否' }, { v: 'unknown', label: '未知' }]}
        value={a.targetedPlayer === undefined ? 'unknown' : a.targetedPlayer ? 'true' : 'false'}
        onChange={(v) => onChange({ ...a, targetedPlayer: v === 'unknown' ? undefined : v === 'true' })} />
      <EditLabel>发球结果</EditLabel>
      <EditChips options={Object.entries(SERVE_RESULT_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.result} onChange={(v) => onChange({ ...a, result: v })} columns={2} />
    </div>
  );
}

function EditReception({ a, onChange, players }: { a: ReceptionAction; onChange: (a: ReceptionAction) => void; players: number[] }) {
  return (
    <div>
      <EditLabel>接一传球员</EditLabel>
      <EditNumbers value={a.playerNumber} onChange={(n) => onChange({ ...a, playerNumber: n })} players={players} />
      <EditLabel>接球位置</EditLabel>
      <EditZones value={a.position} onChange={(z) => onChange({ ...a, position: z })} />
      <EditLabel>到位程度</EditLabel>
      <EditChips options={Object.entries(RECEPTION_QUALITY_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.quality} onChange={(v) => onChange({ ...a, quality: v })} />
    </div>
  );
}

function EditSet({ a, onChange }: { a: SetAction; onChange: (a: SetAction) => void }) {
  return (
    <div>
      <EditLabel>传给几号位</EditLabel>
      <EditZones value={a.positionTo} onChange={(z) => onChange({ ...a, positionTo: z })} />
      <EditLabel>是否到位</EditLabel>
      <EditChips options={Object.entries(SET_QUALITY_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.quality} onChange={(v) => onChange({ ...a, quality: v })} />
    </div>
  );
}

function EditAttack({ a, onChange, players }: { a: AttackAction; onChange: (a: AttackAction) => void; players: number[] }) {
  return (
    <div>
      <EditLabel>传球是否到位</EditLabel>
      <EditChips options={Object.entries(TOUCH_QUALITY_LABELS).filter(([v]) => ['in', 'half', 'out'].includes(v)).map(([v, label]) => ({ v: v as any, label }))} value={a.setQuality} onChange={(v) => onChange({ ...a, setQuality: v })} />
      <EditLabel>进攻球员号码</EditLabel>
      <EditNumbers value={a.attackerNumber} onChange={(n) => onChange({ ...a, attackerNumber: n })} players={players} />
      <EditLabel>对方并拦</EditLabel>
      <EditChips options={[{ v: 'formed', label: '形成' }, { v: 'not_formed', label: '未形成' }]} value={a.opponentBlock} onChange={(v) => onChange({ ...a, opponentBlock: v })} columns={2} />
      <EditLabel>进攻方式</EditLabel>
      <EditChips options={Object.entries(ATTACK_TYPE_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.attackType} onChange={(v) => onChange({ ...a, attackType: v })} />
      <EditLabel>进攻线路</EditLabel>
      <EditChips options={Object.entries(ATTACK_LINE_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.attackLine} onChange={(v) => onChange({ ...a, attackLine: v })} />
      <EditLabel>进攻结果</EditLabel>
      <EditChips options={Object.entries(ATTACK_RESULT_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.result} onChange={(v) => onChange({ ...a, result: v })} columns={2} />
    </div>
  );
}

function EditBDT({ a, onChange, players }: { a: BlockDefenseTransitionAction; onChange: (a: BlockDefenseTransitionAction) => void; players: number[] }) {
  return (
    <div>
      <EditLabel>对方进攻位置</EditLabel>
      <EditZones value={a.opponentAttackPosition} onChange={(z) => onChange({ ...a, opponentAttackPosition: z })} />
      <EditLabel>拦网效果</EditLabel>
      <EditChips options={Object.entries(BLOCK_EFFECT_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.blockEffect} onChange={(v) => onChange({ ...a, blockEffect: v })} columns={2} />
      <EditLabel>对方进攻落点</EditLabel>
      <EditZones value={a.opponentAttackLanding} onChange={(z) => onChange({ ...a, opponentAttackLanding: z })} />
      <EditLabel>第一次触球球员</EditLabel>
      <EditNumbers value={a.firstTouchPlayer} onChange={(n) => onChange({ ...a, firstTouchPlayer: n })} players={players} />
      <EditLabel>第一次触球效果</EditLabel>
      <EditChips options={Object.entries(TOUCH_QUALITY_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.firstTouch} onChange={(v) => onChange({ ...a, firstTouch: v })} />
      <EditLabel>第二次触球球员</EditLabel>
      <EditNumbers value={a.secondTouchPlayer} onChange={(n) => onChange({ ...a, secondTouchPlayer: n })} players={players} />
      <EditLabel>第二次触球效果</EditLabel>
      <EditChips options={Object.entries(TOUCH_QUALITY_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.secondTouch} onChange={(v) => onChange({ ...a, secondTouch: v })} />
      <EditLabel>第三次触球位置</EditLabel>
      <EditZones value={a.thirdTouchPosition} onChange={(z) => onChange({ ...a, thirdTouchPosition: z })} />
      <EditLabel>第三次触球球员</EditLabel>
      <EditNumbers value={a.thirdTouchPlayer} onChange={(n) => onChange({ ...a, thirdTouchPlayer: n })} players={players} />
      <EditLabel>串联结果</EditLabel>
      <EditChips options={Object.entries(TRANSITION_RESULT_LABELS).map(([v, label]) => ({ v: v as any, label }))} value={a.result} onChange={(v) => onChange({ ...a, result: v })} columns={2} />
    </div>
  );
}

function EditForm({ action, players, onSave, onCancel }: {
  action: RallyAction; players: number[]; onSave: (a: RallyAction) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RallyAction>(action);

  return (
    <div className="mt-3 p-3 bg-slate-900/60 rounded-lg">
      {draft.type === 'serve' && <EditServe a={draft as ServeAction} onChange={(a) => setDraft(a)} players={players} />}
      {draft.type === 'reception' && <EditReception a={draft as ReceptionAction} onChange={(a) => setDraft(a)} players={players} />}
      {draft.type === 'set' && <EditSet a={draft as SetAction} onChange={(a) => setDraft(a)} />}
      {draft.type === 'attack' && <EditAttack a={draft as AttackAction} onChange={(a) => setDraft(a)} players={players} />}
      {draft.type === 'block_defense_transition' && <EditBDT a={draft as BlockDefenseTransitionAction} onChange={(a) => setDraft(a)} players={players} />}
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(draft)} className="flex-1 touch-target bg-emerald-600 text-white rounded-lg py-2 text-sm font-semibold active:bg-emerald-700">
          保存此环节
        </button>
        <button onClick={onCancel} className="touch-target bg-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm active:bg-slate-600">
          取消
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export function RallyDetailPage() {
  const { matchId, setId, rallyId } = useParams<{ matchId: string; setId: string; rallyId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [rally, setRally] = useState<Rally | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!matchId || !rallyId) return;
    getMatch(matchId).then((m) => setMatch(m));
    db.rallies.get(rallyId as any).then((r) => setRally(r || null));
  }, [matchId, rallyId]);

  if (!match || !rally) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  const players = match.players?.map((p: any) => p.jerseyNumber).sort((a: number, b: number) => a - b) || [];

  const saveAction = async (index: number, updated: RallyAction) => {
    const newActions = [...rally.actions];
    newActions[index] = updated;
    const updatedRally = { ...rally, actions: newActions };
    setRally(updatedRally);
    setEditingIndex(null);
    setDirty(true);
  };

  const saveAll = async () => {
    try {
      await db.rallies.update(rallyId as any, { actions: rally.actions });
      setDirty(false);
      toast.success('已保存');
    } catch (e) {
      console.error(e);
      toast.error('保存失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/match/${matchId}/set/${setId}`)} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">第 {rally.rallyNumber} 分 · 回合详情</h1>
          <p className="text-sm text-slate-400">
            {rally.side === 'serving' ? '🏐 发球' : '🛡️ 接发'} · 最终 {rally.homeScoreAfter}:{rally.awayScoreAfter}
          </p>
        </div>
        <button onClick={saveAll} disabled={!dirty}
          className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${dirty ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {rally.actions.map((a, i) => {
          const { title, fields } = formatAction(a);
          return (
            <div key={i} className="mb-3">
              <div className="bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">环节 {i + 1}</span>
                    <span className="font-bold">{title}</span>
                  </div>
                  <button onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                    className="touch-target text-primary-400 text-sm p-1 flex items-center gap-1">
                    {editingIndex === i ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                    {editingIndex === i ? '收起' : '编辑'}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {fields.map((f, j) => (
                    <div key={j} className="flex justify-between text-sm">
                      <span className="text-slate-500">{f.label}</span>
                      <span className="text-slate-200">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {editingIndex === i && (
                <EditForm action={a} players={players} onSave={(updated) => saveAction(i, updated)} onCancel={() => setEditingIndex(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
