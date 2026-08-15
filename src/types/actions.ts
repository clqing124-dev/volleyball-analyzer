// ============================================================
// actions.ts — 回合动作的区分联合类型 (Discriminated Union)
// v2：拦防串联扩充字段，进攻独立记录进攻球员，结果拆分
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

export type ServeResult = 'in_position' | 'half_in_position' | 'out_of_position' | 'score' | 'concede';
// 对方到位 / 对方半到位 / 对方不到位 / 得分 / 丢分

export type ReceptionQuality = 'in' | 'half' | 'out' | 'concede' | 'opponent_error' | 'direct_score' | 'to_opponent';
// 到位 / 半到位 / 不到位 / 丢分 / 对方失误 / 直接得分 / 接到对面

export type SetQuality = 'in' | 'half' | 'out' | 'concede' | 'score' | 'second';
// 到位 / 半到位 / 不到位 / 丢分 / 得分

export type TouchQuality = 'in' | 'half' | 'out' | 'concede' | 'score' | 'over_net';
// 到位 / 半到位 / 不到位 / 丢分 / 得分 / 过网

export type AttackType = 'attack' | 'tip' | 'handle' | 'recover';
// 进攻 / 吊球 / 处理 / 回收

export type AttackLine = 'middle' | 'cross' | 'big_cross' | 'small_cross' | 'second_straight' | 'straight';
// 中线 / 大斜线 / 二直线 / 小斜线 / 腰线 / 直线

export type OpponentBlock = 'formed' | 'not_formed';

export type AttackResult = 'error' | 'blocked_kill' | 'score' | 'blocked_back' | 'opponent_handled' | 'opponent_counter';
// 失误 / 被拦死 / 得分 / 拦回 / 对方处理 / 对方形成反击
// 失误、被拦死 均视为丢分

export type BlockEffect =
  | 'block_kill' | 'effective_touch' | 'destructive' | 'no_effective_touch'
  | 'no_block_formed' | 'block_out' | 'net_touch' | 'blocked_back' | 'opponent_error' | 'none';
// 拦死 / 有效撑起 / 破坏性拦网 / 未有效触球 / 未形成并拦 / 打手出界 / 触网 / 拦回 / 对方失误 / 无(进攻拦回/处理)
// 拦死 / 有效撑起 / 破坏性拦网 / 未有效触球 / 未形成并拦 / 打手出界 / 触网 / 无(进攻拦回/处理)

export type TransitionResult = 'form_attack' | 'handle' | 'score' | 'concede';
// 形成进攻 / 处理 / 得分 / 丢分

// ---- 具体动作接口 ----

/** 发球 */
export interface ServeAction extends BaseAction {
  type: 'serve';
  playerNumber?: number;
  serveType: ServeType;
  landingZone?: CourtZone;
  targetedPlayer?: boolean;
  result: ServeResult;
}

/** 一传 */
export interface ReceptionAction extends BaseAction {
  type: 'reception';
  playerNumber?: number;
  position?: CourtZone;
  quality: ReceptionQuality;
}

/** 二传（仅一攻，不含进攻球员号） */
export interface SetAction extends BaseAction {
  type: 'set';
  positionTo?: CourtZone;
  quality: SetQuality;
}

/** 进攻 */
export interface AttackAction extends BaseAction {
  type: 'attack';
  attackNumber: number;
  setQuality?: TouchQuality;
  attackerNumber?: number;
  opponentBlock?: OpponentBlock;
  attackType?: AttackType;
  attackLine?: AttackLine;
  result: AttackResult;
}

/** 拦防串联（合并拦防+串联） */
export interface BlockDefenseTransitionAction extends BaseAction {
  type: 'block_defense_transition';
  opponentAttackPosition?: CourtZone;  // 对方进攻位置
  blockEffect?: BlockEffect;
  opponentAttackLanding?: CourtZone;   // 对方进攻落点
  firstTouchPlayer?: number;           // 第一次触球球员号
  firstTouch?: TouchQuality;           // 第一次触球效果
  secondTouchPlayer?: number;          // 第二次触球球员号
  secondTouch?: TouchQuality;          // 第二次触球效果
  thirdTouchPosition?: CourtZone;
  thirdTouchPlayer?: number;
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
  half_in_position: '对方半到位',
  out_of_position: '对方不到位',
  score: '得分',
  concede: '丢分',
};

export const RECEPTION_QUALITY_LABELS: Record<ReceptionQuality, string> = {
  in: '到位',
  half: '半到位',
  out: '不到位',
  concede: '丢分',
  opponent_error: '对方失误',
  direct_score: '直接得分',
  to_opponent: '接到对面',
};

export const SET_QUALITY_LABELS: Record<SetQuality, string> = {
  in: '到位',
  half: '半到位',
  out: '不到位',
  concede: '丢分',
  score: '得分',
  second: '二次',
};

export const TOUCH_QUALITY_LABELS: Record<TouchQuality, string> = {
  in: '到位',
  half: '半到位',
  out: '不到位',
  concede: '丢分',
  score: '得分',
  over_net: '过网',
};

export const ATTACK_TYPE_LABELS: Record<AttackType, string> = {
  attack: '进攻',
  tip: '吊球',
  handle: '处理',
  recover: '回收',
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
  error: '失误',
  blocked_kill: '被拦死',
  score: '得分',
  blocked_back: '拦回',
  opponent_handled: '对方处理',
  opponent_counter: '对方形成反击',
};

export const BLOCK_EFFECT_LABELS: Record<BlockEffect, string> = {
  block_kill: '拦死',
  effective_touch: '有效撑起',
  destructive: '破坏性拦网',
  no_effective_touch: '未有效触球',
  no_block_formed: '未形成并拦',
  block_out: '打手出界',
  net_touch: '触网',
  blocked_back: '拦回',
  opponent_error: '对方失误',
  none: '无（进攻拦回/处理）',
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
  return quality === 'concede' || quality === 'opponent_error' || quality === 'direct_score';
}

export function isSetTerminal(quality: SetQuality): boolean {
  return quality === 'score' || quality === 'concede';
}

export function isAttackTerminal(result: AttackResult): boolean {
  return result === 'score' || result === 'error' || result === 'blocked_kill';
}

export function isTransitionTerminal(result: TransitionResult): boolean {
  return result === 'score' || result === 'concede';
}
