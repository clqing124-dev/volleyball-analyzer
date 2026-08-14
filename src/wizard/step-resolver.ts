// ============================================================
// step-resolver.ts — 记录向导状态机（v2）
// ============================================================

import type {
  RallyAction, ServeAction, ReceptionAction, SetAction, AttackAction, BlockDefenseTransitionAction,
} from '@/types/actions';
import {
  isServeTerminal, isReceptionTerminal, isSetTerminal, isAttackTerminal, isTransitionTerminal,
} from '@/types/actions';

export type StepKind = 'serve' | 'reception' | 'set' | 'attack' | 'block_defense_transition';

export type NextStep = StepKind | 'end';

export const STEP_LABELS: Record<StepKind, string> = {
  serve: '发球',
  reception: '一传',
  set: '二传',
  attack: '进攻',
  block_defense_transition: '拦防串联',
};

export function getNextStep(action: RallyAction): NextStep {
  switch (action.type) {
    case 'serve': {
      const a = action as ServeAction;
      return isServeTerminal(a.result) ? 'end' : 'block_defense_transition';
    }
    case 'reception': {
      const a = action as ReceptionAction;
      if (isReceptionTerminal(a.quality)) return 'end';
      if (a.quality === 'to_opponent') return 'block_defense_transition';
      return 'set';
    }
    case 'set': {
      const a = action as SetAction;
      return isSetTerminal(a.quality) ? 'end' : 'attack';
    }
    case 'attack': {
      const a = action as AttackAction;
      return isAttackTerminal(a.result) ? 'end' : 'block_defense_transition';
    }
    case 'block_defense_transition': {
      const a = action as BlockDefenseTransitionAction;
      if (isTransitionTerminal(a.result)) return 'end';
      if (a.result === 'form_attack') return 'attack';
      // 'handle'（处理）→ 新的拦防串联
      return 'block_defense_transition';
    }
    default:
      return 'end';
  }
}

export function getOutcome(action: RallyAction): 'our_score' | 'their_score' {
  switch (action.type) {
    case 'serve':
      return (action as ServeAction).result === 'score' ? 'our_score' : 'their_score';
    case 'reception': {
      const q = (action as ReceptionAction).quality;
      // 丢分=their，对方失误/直接得分=our
      return (q === 'opponent_error' || q === 'direct_score') ? 'our_score' : 'their_score';
    }
    case 'set':
      return (action as SetAction).quality === 'score' ? 'our_score' : 'their_score';
    case 'attack': {
      const r = (action as AttackAction).result;
      // score=our，error/blocked_kill=their
      return r === 'score' ? 'our_score' : 'their_score';
    }
    case 'block_defense_transition':
      return (action as BlockDefenseTransitionAction).result === 'score' ? 'our_score' : 'their_score';
    default:
      return 'their_score';
  }
}
