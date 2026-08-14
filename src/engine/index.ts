// ============================================================
// statistics engine — 统计计算引擎（重构版）
// ============================================================

import type { Rally, MatchMode } from '@/types/domain';
import type {
  RallyAction, ServeAction, ReceptionAction, SetAction,
  AttackAction, BlockDefenseTransitionAction,
} from '@/types/actions';
import type {
  ServeStatistics, ReceptionStatistics, SetStatistics,
  AttackStatistics, BlockDefenseTransitionStatistics, MatchStatistics, StatFilters,
} from '@/types/stats';

// ============================================================
// Helpers
// ============================================================

function safeRate(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function acts<T extends RallyAction>(actions: RallyAction[], type: RallyAction['type']): T[] {
  return actions.filter((a): a is T => a.type === type);
}

// 一传到位程度排序：out=0, half=1, in=2, to_opponent 单独处理
function receptionRank(q: string): number {
  switch (q) {
    case 'in': return 2;
    case 'half': return 1;
    case 'out': return 0;
    default: return -1;
  }
}

function filterRallies(rallies: Rally[], filters: StatFilters): Rally[] {
  let result = [...rallies];
  if (filters.minReceptionQuality) {
    const minRank = receptionRank(filters.minReceptionQuality);
    result = result.filter((r) => {
      const rec = r.actions.find((a): a is ReceptionAction => a.type === 'reception');
      if (!rec) return true; // 没有一传（发球方回合）不筛选
      return receptionRank(rec.quality) >= minRank;
    });
  }
  return result;
}

function filterActionsByPlayer(actions: RallyAction[], playerNumber?: number): RallyAction[] {
  if (!playerNumber) return actions;
  return actions.filter((a) => {
    switch (a.type) {
      case 'serve': return a.playerNumber === playerNumber;
      case 'reception': return a.playerNumber === playerNumber;
      case 'set': return true; // 二传无球员号，保留
      case 'attack': return a.attackerNumber === playerNumber;
      case 'block_defense_transition':
        return a.firstTouchPlayer === playerNumber || a.secondTouchPlayer === playerNumber || a.thirdTouchPlayer === playerNumber;
      default: return true;
    }
  });
}

// ============================================================
// 计算函数
// ============================================================

function emptyServe(): ServeStatistics {
  return { totalServes: 0, scores: 0, outOfPosition: 0, concedes: 0, targetedCount: 0,
    scoreRate: 0, breakRate: 0, errorRate: 0, efficiencyIndex: 0, tacticalSuccessRate: 0 };
}

export function computeServeStats(actions: RallyAction[]): ServeStatistics {
  const serves = acts<ServeAction>(actions, 'serve');
  const total = serves.length;
  if (total === 0) return emptyServe();

  const scores = serves.filter((s) => s.result === 'score').length;
  const outOfPosition = serves.filter((s) => s.result === 'out_of_position').length;
  const concedes = serves.filter((s) => s.result === 'concede').length;
  const targeted = serves.filter((s) => s.targetedPlayer === true).length;

  return {
    totalServes: total,
    scores,
    outOfPosition,
    concedes,
    targetedCount: targeted,
    scoreRate: safeRate(scores, total),
    breakRate: safeRate(outOfPosition, total),
    errorRate: safeRate(concedes, total),
    efficiencyIndex: safeRate(scores * 3 + outOfPosition * 1 - concedes * 4, total),
    tacticalSuccessRate: safeRate(targeted, total),
  };
}

function emptyReception(): ReceptionStatistics {
  return { totalReceptions: 0, inPosition: 0, outOfPosition: 0, toOpponent: 0, concedes: 0,
    inPositionRate: 0, outOfPositionRate: 0, errorRate: 0 };
}

export function computeReceptionStats(actions: RallyAction[]): ReceptionStatistics {
  const recs = acts<ReceptionAction>(actions, 'reception');
  const total = recs.length;
  if (total === 0) return emptyReception();

  const inPosition = recs.filter((r) => r.quality === 'in').length;
  const outOfPosition = recs.filter((r) => r.quality === 'out').length;
  const toOpponent = recs.filter((r) => r.quality === 'to_opponent').length;
  const concedes = recs.filter((r) => r.quality === 'concede').length;

  return {
    totalReceptions: total,
    inPosition,
    outOfPosition,
    toOpponent,
    concedes,
    inPositionRate: safeRate(inPosition, total),
    outOfPositionRate: safeRate(outOfPosition, total),
    errorRate: safeRate(concedes + toOpponent, total),
  };
}

function emptySet(): SetStatistics {
  return { totalSets: 0, inPosition: 0, qualityRate: 0,
    distributionByZone: { 2: 0, 3: 0, 4: 0, 6: 0 },
    position4Rate: 0, position2Rate: 0, position3Rate: 0, position6Rate: 0, blockFormationRate: 0 };
}

export function computeSetStats(actions: RallyAction[]): SetStatistics {
  // 二传仅分析一攻，排除直接得分/丢分
  const sets = acts<SetAction>(actions, 'set').filter((s) => s.quality !== 'score' && s.quality !== 'concede');
  const total = sets.length;
  if (total === 0) return emptySet();

  const inPosition = sets.filter((s) => s.quality === 'in').length;
  const dist: Record<number, number> = { 2: 0, 3: 0, 4: 0, 6: 0 };
  for (const s of sets) {
    if (s.positionTo && [2, 3, 4, 6].includes(s.positionTo)) dist[s.positionTo]++;
  }

  // 一攻拦网形成率：attackNumber === 1 中对方拦网形成数 / 总进攻数
  const attacks = acts<AttackAction>(actions, 'attack');
  const firstAttacks = attacks.filter((a) => a.attackNumber === 1);
  const firstBlockFormed = firstAttacks.filter((a) => a.opponentBlock === 'formed').length;

  return {
    totalSets: total,
    inPosition,
    qualityRate: safeRate(inPosition, total),
    distributionByZone: dist,
    position4Rate: safeRate(dist[4], total),
    position2Rate: safeRate(dist[2], total),
    position3Rate: safeRate(dist[3], total),
    position6Rate: safeRate(dist[6], total),
    blockFormationRate: safeRate(firstBlockFormed, firstAttacks.length),
  };
}

function emptyAttack(): AttackStatistics {
  return { totalAttacks: 0, scores: 0, concedes: 0, opponentHandled: 0,
    scoringRateBySetQuality: { in: 0, out: 0 },
    effectiveRateBySetQuality: { in: 0, out: 0 },
    efficiency: 0, firstAttackScoreRate: 0, counterAttackScoreRate: 0 };
}

export function computeAttackStats(actions: RallyAction[]): AttackStatistics {
  const attacks = acts<AttackAction>(actions, 'attack');
  const total = attacks.length;
  if (total === 0) return emptyAttack();

  const scores = attacks.filter((a) => a.result === 'score').length;
  const concedes = attacks.filter((a) => a.result === 'error' || a.result === 'blocked_kill').length;
  const handled = attacks.filter((a) => a.result === 'opponent_handled').length;

  // 到位/不到位切分
  const inAttacks = attacks.filter((a) => a.setQuality === 'in');
  const outAttacks = attacks.filter((a) => a.setQuality === 'half' || a.setQuality === 'out');
  const inScores = inAttacks.filter((a) => a.result === 'score').length;
  const outScores = outAttacks.filter((a) => a.result === 'score').length;
  const inEffective = inAttacks.filter((a) => a.result === 'score' || a.result === 'opponent_handled').length;
  const outEffective = outAttacks.filter((a) => a.result === 'score' || a.result === 'opponent_handled').length;

  // 一攻/防反
  const firstAttacks = attacks.filter((a) => a.attackNumber === 1);
  const counterAttacks = attacks.filter((a) => a.attackNumber !== 1);
  const firstScores = firstAttacks.filter((a) => a.result === 'score').length;
  const counterScores = counterAttacks.filter((a) => a.result === 'score').length;

  return {
    totalAttacks: total,
    scores,
    concedes,
    opponentHandled: handled,
    scoringRateBySetQuality: {
      in: safeRate(inScores, inAttacks.length),
      out: safeRate(outScores, outAttacks.length),
    },
    effectiveRateBySetQuality: {
      in: safeRate(inEffective, inAttacks.length),
      out: safeRate(outEffective, outAttacks.length),
    },
    efficiency: safeRate(scores - concedes, total),
    firstAttackScoreRate: safeRate(firstScores, firstAttacks.length),
    counterAttackScoreRate: safeRate(counterScores, counterAttacks.length),
  };
}

function emptyBDT(): BlockDefenseTransitionStatistics {
  return { totalBlocks: 0, blockKills: 0, effectiveTouches: 0, destructive: 0, noEffectiveTouch: 0,
    effectiveBlockRate: 0, destructiveBlockRate: 0, noBlockRate: 0,
    totalFirstTouch: 0, firstTouchEffectiveRate: 0, firstTouchInRate: 0,
    totalSecondTouch: 0, secondTouchInRate: 0,
    secondTouchDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0 },
    secondTouchPosRates: { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0 },
    counterBlockFormationRate: 0 };
}

export function computeBlockDefenseTransitionStats(actions: RallyAction[]): BlockDefenseTransitionStatistics {
  const bdts = acts<BlockDefenseTransitionAction>(actions, 'block_defense_transition');
  if (bdts.length === 0) return emptyBDT();

  // 拦网分析（去掉 blockEffect=none）
  const blocks = bdts.filter((b) => b.blockEffect !== 'none' && b.blockEffect !== undefined);
  const totalBlocks = blocks.length;
  const blockKills = blocks.filter((b) => b.blockEffect === 'block_kill').length;
  const effectiveTouches = blocks.filter((b) => b.blockEffect === 'effective_touch').length;
  const destructive = blocks.filter((b) => b.blockEffect === 'destructive').length;
  const noEffective = blocks.filter((b) => b.blockEffect === 'no_block_formed').length;

  // 第一次触球
  const firstTouches = bdts.filter((b) => b.firstTouch !== undefined);
  const firstEffective = firstTouches.filter((b) => b.firstTouch === 'in' || b.firstTouch === 'half').length;
  const firstIn = firstTouches.filter((b) => b.firstTouch === 'in').length;

  // 第二次触球（不含丢分/得分）
  const secondTouches = bdts.filter((b) => b.secondTouch !== undefined && b.secondTouch !== 'score' && b.secondTouch !== 'concede');
  const secondIn = secondTouches.filter((b) => b.secondTouch === 'in' || b.secondTouch === 'half').length;
  const secondDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0 };
  for (const b of secondTouches) {
    if (b.thirdTouchPosition && [1, 2, 3, 4, 6].includes(b.thirdTouchPosition)) secondDist[b.thirdTouchPosition]++;
  }

  // 非一攻拦网形成率
  const attacks = acts<AttackAction>(actions, 'attack');
  const counterAttacks = attacks.filter((a) => a.attackNumber !== 1);
  const counterBlockFormed = counterAttacks.filter((a) => a.opponentBlock === 'formed').length;

  const posRates: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0 };
  for (const k of [1, 2, 3, 4, 6]) {
    posRates[k] = safeRate(secondDist[k], secondTouches.length);
  }

  return {
    totalBlocks,
    blockKills,
    effectiveTouches,
    destructive,
    noEffectiveTouch: noEffective,
    effectiveBlockRate: safeRate(blockKills + effectiveTouches, totalBlocks),
    destructiveBlockRate: safeRate(destructive, totalBlocks),
    noBlockRate: safeRate(noEffective, totalBlocks),
    totalFirstTouch: firstTouches.length,
    firstTouchEffectiveRate: safeRate(firstEffective, firstTouches.length),
    firstTouchInRate: safeRate(firstIn, firstTouches.length),
    totalSecondTouch: secondTouches.length,
    secondTouchInRate: safeRate(secondIn, secondTouches.length),
    secondTouchDistribution: secondDist,
    secondTouchPosRates: posRates,
    counterBlockFormationRate: safeRate(counterBlockFormed, counterAttacks.length),
  };
}

// ============================================================
// 汇总
// ============================================================

export function computeMatchStatistics(
  rallies: Rally[],
  mode: MatchMode,
  filters?: StatFilters,
): MatchStatistics {
  const filtered = filterRallies(rallies, filters || {});
  const allActions = filtered.flatMap((r) => r.actions);
  const filteredActions = filterActionsByPlayer(allActions, filters?.playerNumber);

  return {
    serve: computeServeStats(filteredActions),
    reception: computeReceptionStats(filteredActions),
    set: computeSetStats(filteredActions),
    attack: computeAttackStats(filteredActions),
    blockDefenseTransition: computeBlockDefenseTransitionStats(filteredActions),
    totalRallies: filtered.length,
    totalPointsScored: filtered.filter((r) => r.outcome === 'our_score').length,
    totalPointsConceded: filtered.filter((r) => r.outcome === 'their_score').length,
    rallyWinRate: safeRate(filtered.filter((r) => r.outcome === 'our_score').length, filtered.length),
  };
}
