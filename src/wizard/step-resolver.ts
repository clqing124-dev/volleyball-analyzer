// ============================================================
// step-resolver.ts — 记录向导状态机 (纯函数)
// ============================================================
// 根据当前步骤、动作结果、模式和侧，返回下一步

import type { MatchMode, RallySide, RallyOutcome } from '@/types/domain';
import { isServeTerminal, isAttackTerminal, isFinalEffectTerminal } from '@/types/actions';

export type WizardStepKind =
  | 'rally_start'
  | 'serve'
  | 'reception'
  | 'set'
  | 'attack'
  | 'block_defense'
  | 'transition'
  | 'rally_complete';

export interface WizardStep {
  kind: WizardStepKind;
  /** 是否是第一个交换周期 (非往返) */
  isFirstExchange: boolean;
  /** 当前是第几个往返 (0 = 首次攻击) */
  exchangeNumber: number;
}

export interface StepResult {
  isTerminal: boolean;
  outcome?: RallyOutcome;
}

/**
 * 获取向导的下一步
 *
 * @param current   当前步骤
 * @param result    上一步的结果
 * @param mode      比赛模式 (own / opponent)
 * @param side      发球方 / 接发方
 * @returns         下一步，null 表示回合已完成
 */
export function getNextStep(
  current: WizardStep,
  result: StepResult,
  mode: MatchMode,
  side: RallySide,
): WizardStep | null {
  const { kind, isFirstExchange, exchangeNumber } = current;

  // 如果结果是终态的，跳转到回合结束
  if (result.isTerminal) {
    return {
      kind: 'rally_complete',
      isFirstExchange,
      exchangeNumber,
    };
  }

  // 不是终态，按状态机跳转
  switch (kind) {
    // ======== 发球方 ========
    case 'serve':
      return {
        kind: 'block_defense',
        isFirstExchange: true,
        exchangeNumber: 0,
      };

    case 'block_defense': {
      // 首次交换中：发球后的拦防 → 传球 → 进攻
      if (isFirstExchange) {
        return { kind: 'set', isFirstExchange: true, exchangeNumber: 0 };
      }
      // 往返中：拦防 → 串联(own) 或 传球(opponent) → 进攻
      if (mode === 'own') {
        return { kind: 'transition', isFirstExchange: false, exchangeNumber };
      } else {
        return { kind: 'set', isFirstExchange: false, exchangeNumber };
      }
    }

    case 'set':
      return { kind: 'attack', isFirstExchange, exchangeNumber };

    case 'transition':
      return { kind: 'attack', isFirstExchange, exchangeNumber };

    case 'attack': {
      // 进入往返循环
      const nextExchange = exchangeNumber + 1;
      return {
        kind: 'block_defense',
        isFirstExchange: false,
        exchangeNumber: nextExchange,
      };
    }

    // ======== 接发方 ========
    case 'reception':
      return { kind: 'set', isFirstExchange: true, exchangeNumber: 0 };

    // ======== 边界情况 ========
    case 'rally_start':
    case 'rally_complete':
      return null;

    default:
      return null;
  }
}

/**
 * 获取回合的起始步骤
 */
export function getStartingStep(side: RallySide): WizardStep {
  if (side === 'serving') {
    return { kind: 'serve', isFirstExchange: true, exchangeNumber: 0 };
  } else {
    return { kind: 'reception', isFirstExchange: true, exchangeNumber: 0 };
  }
}

/**
 * 根据上一步的类型判断是否需要判断 "是否发到追发人"
 */
export function isServeTerminalResult(result: string): result is 'ace' | 'error' {
  return result === 'ace' || result === 'error';
}

/**
 * 对手模式下判断拦防是否终结回合
 * (对手模式没有 finalEffect，需要根据 blockEffect 判断)
 */
export function isBlockDefenseTerminalInOpponent(blockEffect: string): boolean {
  return blockEffect === 'block_kill';
}

/**
 * 步骤的中文显示名
 */
export const STEP_LABELS: Record<WizardStepKind, string> = {
  rally_start: '开始',
  serve: '发球',
  reception: '一传',
  set: '二传',
  attack: '进攻',
  block_defense: '拦防',
  transition: '串联',
  rally_complete: '完成',
};
