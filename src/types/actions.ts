// ============================================================
// actions.ts — 回合动作的区分联合类型 (Discriminated Union)
// 重构版：统一单一记录对象，拦防串联合并拦防+串联
// ============================================================

// ---- 基础 ----

export type ActionType = 'serve' | 'reception' | 'set' | 'attack' | 'block_defense_transition';

export interface BaseAction {
  id: string;
  type: ActionType;
  sequenceOrder: number;
}

// ---- 值类型 ----

export type ServeType = 'jump' | 'float';
export type CourtZone = 1 | 2 | 3 | 4 | 5 | 6;

export type ServeResult = 'in_position' | 'out_of_position' | 'score' | 'concede';
// 对方到位 / 对方不到位 / 得分 / 丢分

export type ReceptionQuality = 'out' | 'half' | 'in' | 'to_opponent' | 'concede' | 'score';
// 不到位 / 半到位 / 到位 / 接到对面 / 丢分 / 得分

export type SetQuality = 'in' | 'half' | 'out' | 'concede' | 'score';
// 到位 / 半到位 / 不到位 / 丢分 / 得分

export type TouchQuality = 'in' | 'half' | 'out' | 'concede' | 'score';
// 到位 / 半到位 / 不到位 / 丢分 / 得分（用于第一次/第二次触球）

export type AttackType = 'attack' | 'tip' | 'handle';
// 进攻 / 吊球 / 处理

export type AttackLine = 'middle' | 'cross' | 'big_cross' | 'small_cross' | 'second_straight' | 'straight';
// 中线 / 大斜线 / 二直线 / 小斜线 / 腰线 / 直线

export type OpponentBlock = 'formed' | 'not_formed';

export type AttackResult = 'score' | 'concede' | 'blocked_back' | 'opponent_handled' | 'opponent_counter';
// 得分 / 丢分 / 拦回 / 对方处理 / 对方形成反击

export type BlockEffect = 'block_kill' | 'effective_touch' | 'destructive' | 'no_effective_touch' | 'block_out' | 'none';
// 拦死 / 有效撑起 / 破坏性拦网 / 未有效触球 / 打手出界 / 无(进攻拦回)

export type TransitionResult = 'form_attack' | 'handle' | 'score' | 'concede';
// 形成进攻 / 处理 / 得分 / 丢分

// ---- 具体动作接口 ----

/** 发球 */
export interface ServeAction extends BaseAction {
  type: 'serve';
  playerNumber?: number;
  serveType: ServeType;
  landingZone?: CourtZone;
  targetedPlayer?: boolean;          // 是否发到追发人（可跳过）
  result: ServeResult;
}

/** 一传 */
export interface ReceptionAction extends BaseAction {
  type: 'reception';
  playerNumber?: number;
  position?: CourtZone;              // 接球位置
  quality: ReceptionQuality;
}

/** 二传（仅一攻） */
export interface SetAction extends BaseAction {
  type: 'set';
  positionTo?: CourtZone;
  attackerNumber?: number;
  quality: SetQuality;
}

/** 进攻 */
export interface AttackAction extends BaseAction {
  type: 'attack';
  attackNumber: number;              // 回合内第几次进攻
  setQuality?: TouchQuality;         // 传球是否到位
  opponentBlock?: OpponentBlock;
  attackType?: AttackType;
  attackLine?: AttackLine;
  result: AttackResult;
}

/** 拦防串联（合并拦防+串联） */
export interface BlockDefenseTransitionAction extends BaseAction {
  type: 'block_defense_transition';
  blockEffect?: BlockEffect;
  firstTouch?: TouchQuality;         // 第一次触球效果
  secondTouch?: TouchQuality;        // 第二次触球效果
  thirdTouchPosition?: CourtZone;    // 第三次触球位置
  thirdTouchPlayer?: number;         // 第三次触球球员号码
  result: TransitionResult;
}

// ---- 联合类型 ----

export type RallyAction =
  | ServeAction
  | ReceptionAction
  | SetAction
  | AttackAction
  | BlockDefenseTransitionAction;

// ---- 中文标签映射 ----

export const SERVE_TYPE_LABELS: Record<ServeType, string> = {
  jump: '跳发',
  float: '飘球',
};

export const COURT_ZONE_LABELS: Record<CourtZone, string> = {
  1: '1号位', 2: '2号位', 3: '3号位', 4: '4号位', 5: '5号位', 6: '6号位',
};

export const SERVE_RESULT_LABELS: Record<ServeResult, string> = {
  in_position: '对方到位',
  out_of_position: '对方不到位',
  score: '得分',
  concede: '丢分',
};

export const RECEPTION_QUALITY_LABELS: Record<ReceptionQuality, string> = {
  out: '不到位',
  half: '半到位',
  in: '到位',
  to_opponent: '接到对面',
  concede: '丢分',
  score: '得分',
};

export const SET_QUALITY_LABELS: Record<SetQuality, string> = {
  in: '到位',
  half: '半到位',
  out: '不到位',
  concede: '丢分',
  score: '得分',
};

export const TOUCH_QUALITY_LABELS: Record<TouchQuality, string> = {
  in: '到位',
  half: '半到位',
  out: '不到位',
  concede: '丢分',
  score: '得分',
};

export const ATTACK_TYPE_LABELS: Record<AttackType, string> = {
  attack: '进攻',
  tip: '吊球',
  handle: '处理',
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
  blocked_back: '拦回',
  opponent_handled: '对方处理',
  opponent_counter: '对方形成反击',
};

export const BLOCK_EFFECT_LABELS: Record<BlockEffect, string> = {
  block_kill: '拦死',
  effective_touch: '有效撑起',
  destructive: '破坏性拦网',
  no_effective_touch: '未有效触球',
  block_out: '打手出界',
  none: '无（进攻拦回）',
};

export const TRANSITION_RESULT_LABELS: Record<TransitionResult, string> = {
  form_attack: '形成进攻',
  handle: '处理',
  score: '得分',
  concede: '丢分',
};

// ---- 结果是否结束回合 ----

export function isServeTerminal(result: ServeResult): boolean {
  return result === 'score' || result === 'concede';
}

export function isReceptionTerminal(quality: ReceptionQuality): boolean {
  return quality === 'score' || quality === 'concede';
}

export function isSetTerminal(quality: SetQuality): boolean {
  return quality === 'score' || quality === 'concede';
}

export function isAttackTerminal(result: AttackResult): boolean {
  return result === 'score' || result === 'concede';
}

export function isTransitionTerminal(result: TransitionResult): boolean {
  return result === 'score' || result === 'concede';
}

export function outcomeFromResult(isScore: boolean): 'our_score' | 'their_score' {
  return isScore ? 'our_score' : 'their_score';
}
