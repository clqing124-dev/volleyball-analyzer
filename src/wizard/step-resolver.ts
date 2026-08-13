// ============================================================
// step-resolver.ts — 记录向导状态机（重构版，统一流程）
// ============================================================
// 根据当前步骤和动作结果，返回下一步骤。
// 流程遵循真实排球逻辑：
//   发球方：发球 → 拦防串联 → 进攻 → 拦防串联 → ... (直到得分/丢分)
//   接发方：一传 → 二传(一攻) → 进攻 → 拦防串联 → ... (直到得分/丢分)
//   一传接到对面 → 直接拦防串联

import type { RallyAction, ServeAction, ReceptionAction, SetAction, AttackAction, BlockDefenseTransitionAction } from '@/types/actions';

export type StepKind = 'serve' | 'reception' | 'set' | 'attack' | 'block_defense_transition';

export type NextStep = StepKind | 'end';

export const STEP_LABELS: Record<StepKind, string> = {
  serve: '发球',
  reception: '一传',
  set: '二传',
  attack: '进攻',
  block_defense_transition: '拦防串联',
};

/**
 * 给定动作，返回下一步骤（或 'end' 表示回合结束）
 */
export function getNextStep(action: RallyAction): NextStep {
  switch (action.type) {
    case 'serve': {
      const a = action as ServeAction;
      return a.result === 'score' || a.result === 'concede'
        ? 'end'
        : 'block_defense_transition';
    }

    case 'reception': {
      const a = action as ReceptionAction;
      if (a.quality === 'score' || a.quality === 'concede') return 'end';
      if (a.quality === 'to_opponent') return 'block_defense_transition';
      return 'set';
    }

    case 'set': {
      const a = action as SetAction;
      return a.quality === 'score' || a.quality === 'concede'
        ? 'end'
        : 'attack';
    }

    case 'attack': {
      const a = action as AttackAction;
      return a.result === 'score' || a.result === 'concede'
        ? 'end'
        : 'block_defense_transition';
    }

    case 'block_defense_transition': {
      const a = action as BlockDefenseTransitionAction;
      if (a.result === 'score' || a.result === 'concede') return 'end';
      if (a.result === 'form_attack') return 'attack';
      // 'handle'（处理）→ 球回到对方，继续拦防串联
      return 'block_defense_transition';
    }

    default:
      return 'end';
  }
}

/**
 * 给定动作，判断回合结果（得分方）
 */
export function getOutcome(action: RallyAction): 'our_score' | 'their_score' {
  let isScore = false;
  switch (action.type) {
    case 'serve':
      isScore = (action as ServeAction).result === 'score';
      break;
    case 'reception':
      isScore = (action as ReceptionAction).quality === 'score';
      break;
    case 'set':
      isScore = (action as SetAction).quality === 'score';
      break;
    case 'attack':
      isScore = (action as AttackAction).result === 'score';
      break;
    case 'block_defense_transition':
      isScore = (action as BlockDefenseTransitionAction).result === 'score';
      break;
  }
  return isScore ? 'our_score' : 'their_score';
}
