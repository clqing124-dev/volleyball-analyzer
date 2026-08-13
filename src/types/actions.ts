// ============================================================
// actions.ts — 回合动作的区分联合类型 (Discriminated Union)
// ============================================================

// ---- 基础 ----

export type ActionType = 'serve' | 'reception' | 'set' | 'attack' | 'block_defense' | 'transition';

export interface BaseAction {
  id: string;
  type: ActionType;
  sequenceOrder: number;
}

// ---- 值类型 ----

export type ServeType = 'jump' | 'float';
export type CourtZone = 1 | 2 | 3 | 4 | 5 | 6;
export type ReceptionQuality = 0 | 0.5 | 1;
export type SetQuality = 'in_position' | 'half' | 'out_of_position';
export type AttackLine = 'middle' | 'cross' | 'big_cross' | 'small_cross' | 'second_straight' | 'straight';
export type OpponentBlock = 'formed' | 'not_formed';
export type AttackResult = 'score' | 'concede' | 'blocked_back' | 'opponent_handled' | 'opponent_counter';
export type BlockEffect = 'block_kill' | 'effective_touch' | 'destructive' | 'no_touch';
export type DefenseEffect = 'in_position' | 'out_of_position' | 'not_dug' | 'no_touch';
export type FinalEffect = 'score' | 'concede' | 'rally_continues';
export type BlockProtection = 'successful' | 'failed' | 'not_attempted';
export type SecondTouchQuality = 'in_position' | 'half' | 'out_of_position';

// ---- 具体动作接口 ----

/** 发球 */
export interface ServeAction extends BaseAction {
  type: 'serve';
  playerNumber: number;
  serveType: ServeType;
  landingZone: CourtZone;
  targetedPlayer: boolean;           // 仅己方分析使用
  result: 'opponent_in_position' | 'opponent_out_of_position' | 'ace' | 'error';
}

/** 一传 */
export interface ReceptionAction extends BaseAction {
  type: 'reception';
  playerNumber: number;
  quality: ReceptionQuality;
}

/** 二传 */
export interface SetAction extends BaseAction {
  type: 'set';
  positionTo: CourtZone;
  attackerNumber: number;
  quality: SetQuality;
}

/** 进攻 */
export interface AttackAction extends BaseAction {
  type: 'attack';
  opponentBlock: OpponentBlock;
  attackLine: AttackLine;
  result: AttackResult;
}

/** 拦防 */
export interface BlockDefenseAction extends BaseAction {
  type: 'block_defense';
  blockEffect: BlockEffect;
  defenseEffect: DefenseEffect;
  finalEffect: FinalEffect;             // 拦防结果：得分/丢分/往返继续
}

/** 串联 — 仅己方分析 */
export interface TransitionAction extends BaseAction {
  type: 'transition';
  blockProtection: BlockProtection;
  secondTouchQuality: SecondTouchQuality;
}

// ---- 联合类型 ----

export type RallyAction =
  | ServeAction
  | ReceptionAction
  | SetAction
  | AttackAction
  | BlockDefenseAction
  | TransitionAction;

// ---- 中文标签映射 ----

export const SERVE_TYPE_LABELS: Record<ServeType, string> = {
  jump: '跳发',
  float: '飘球',
};

export const COURT_ZONE_LABELS: Record<CourtZone, string> = {
  1: '1号位', 2: '2号位', 3: '3号位', 4: '4号位', 5: '5号位', 6: '6号位',
};

export const RECEPTION_QUALITY_LABELS: Record<ReceptionQuality, string> = {
  0: '不到位',
  0.5: '半到位',
  1: '到位',
};

export const SET_QUALITY_LABELS: Record<SetQuality, string> = {
  in_position: '到位',
  half: '半到位',
  out_of_position: '不到位',
};

export const ATTACK_LINE_LABELS: Record<AttackLine, string> = {
  middle: '中线',
  cross: '大斜线',
  big_cross: '二直线',
  small_cross: '小斜线',
  second_straight: '腰线',
  straight: '直线',
};

export const ATTACK_RESULT_LABELS: Record<AttackResult, string> = {
  score: '得分',
  concede: '丢分',
  blocked_back: '拦回继续',
  opponent_handled: '对方处理',
  opponent_counter: '对方形成反击',
};

export const BLOCK_EFFECT_LABELS: Record<BlockEffect, string> = {
  block_kill: '拦死',
  effective_touch: '有效撑起',
  destructive: '破坏性拦网',
  no_touch: '未触球',
};

export const DEFENSE_EFFECT_LABELS: Record<DefenseEffect, string> = {
  in_position: '到位',
  out_of_position: '不到位',
  not_dug: '未防起',
  no_touch: '未触球',
};

export const FINAL_EFFECT_LABELS: Record<FinalEffect, string> = {
  score: '得分',
  concede: '丢分',
  rally_continues: '往返继续',
};

export const BLOCK_PROTECTION_LABELS: Record<BlockProtection, string> = {
  successful: '保护成功',
  failed: '保护未成功',
  not_attempted: '未保护',
};

export const SECOND_TOUCH_QUALITY_LABELS: Record<SecondTouchQuality, string> = {
  in_position: '到位',
  half: '半到位',
  out_of_position: '不到位',
};

// ---- 结果是否结束回合 ----

export function isServeTerminal(result: ServeAction['result']): boolean {
  return result === 'ace' || result === 'error';
}

export function isAttackTerminal(result: AttackResult): boolean {
  return result === 'score' || result === 'concede';
}

export function isFinalEffectTerminal(effect: FinalEffect): boolean {
  return effect === 'score' || effect === 'concede';
}
