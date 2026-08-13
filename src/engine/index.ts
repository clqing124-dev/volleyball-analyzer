// ============================================================
// statistics engine — 统计计算引擎
// ============================================================

import type { Rally, MatchMode } from '@/types/domain';
import type {
  RallyAction,
  ServeAction, ReceptionAction, SetAction,
  AttackAction, BlockDefenseAction, TransitionAction,
} from '@/types/actions';
import type {
  ServeStatistics, ReceptionStatistics, SetStatistics,
  AttackStatistics, BlockDefenseStatistics, TransitionStatistics,
  MatchStatistics, StatFilters,
} from '@/types/stats';

// ============================================================
// Helpers
// ============================================================

function actionsOfType<T extends RallyAction>(actions: RallyAction[], type: RallyAction['type']): T[] {
  return actions.filter((a): a is T => a.type === type);
}

function emptyServeStats(): ServeStatistics {
  return { totalServes: 0, aces: 0, errors: 0, opponentInPosition: 0, opponentOutOfPosition: 0,
    aceRate: 0, servePressureRate: 0, errorRate: 0, tacticalSuccessRate: 0 };
}

function emptyReceptionStats(): ReceptionStatistics {
  return { totalReceptions: 0, inPosition: 0, halfInPosition: 0, out: 0, inPositionRate: 0, outOfPositionRate: 0 };
}

function emptySetStats(): SetStatistics {
  return { totalSets: 0, inPosition: 0, half: 0, outOfPosition: 0, qualityRate: 0,
    distributionByZone: { 2: 0, 3: 0, 4: 0, 6: 0 },
    position4Rate: 0, position2Rate: 0, position3Rate: 0, position6Rate: 0,
    blockFormationRate: 0 };
}

function emptyAttackStats(): AttackStatistics {
  return { totalAttacks: 0, scores: 0, concedes: 0, blockedBack: 0, opponentHandled: 0, opponentCounter: 0,
    scoringRate: 0, effectiveAttackRate: 0,
    scoringRateBySetQuality: { inPosition: 0, outOfPosition: 0 },
    effectiveRateBySetQuality: { inPosition: 0, outOfPosition: 0 } };
}

function emptyBlockDefenseStats(): BlockDefenseStatistics {
  return { totalBlockDefenses: 0, blockKills: 0, effectiveTouches: 0, destructiveBlocks: 0, noBlockTouches: 0,
    effectiveBlockRate: 0, destructiveBlockRate: 0, noBlockRate: 0,
    inPositionDefense: 0, outOfPositionDefense: 0, notDug: 0, noDefenseTouch: 0, effectiveDefenseRate: 0 };
}

function emptyTransitionStats(): TransitionStatistics {
  return { totalTransitions: 0, successfulBlockProtection: 0, failedBlockProtection: 0, notAttemptedBlockProtection: 0,
    blockProtectionSuccessRate: 0,
    inPositionSecondTouch: 0, halfSecondTouch: 0, outOfPositionSecondTouch: 0, secondTouchQualityRate: 0 };
}

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

// ============================================================
// Filtering
// ============================================================

export function filterRallies(rallies: Rally[], filters: StatFilters): Rally[] {
  let filtered = [...rallies];

  if (filters.minReceptionQuality !== undefined) {
    filtered = filtered.filter((r) => {
      const reception = r.actions.find((a: RallyAction): a is ReceptionAction => a.type === 'reception');
      return reception && reception.quality >= filters.minReceptionQuality!;
    });
  }

  return filtered;
}

export function filterActionsByPlayer(actions: RallyAction[], playerNumber?: number): RallyAction[] {
  if (!playerNumber) return actions;

  return actions.filter((a) => {
    switch (a.type) {
      case 'serve':
        return a.playerNumber === playerNumber;
      case 'reception':
        return a.playerNumber === playerNumber;
      case 'set':
        return a.attackerNumber === playerNumber;
      case 'attack':
      case 'block_defense':
      case 'transition':
        // 这些不直接关联球员号码，保留
        return true;
      default:
        return true;
    }
  });
}

// ============================================================
// Computation Functions
// ============================================================

export function computeServeStats(actions: RallyAction[], filters?: StatFilters): ServeStatistics {
  let serves = actionsOfType<ServeAction>(actions, 'serve');
  if (filters?.playerNumber) {
    serves = serves.filter((s) => s.playerNumber === filters.playerNumber);
  }

  const total = serves.length;
  if (total === 0) return emptyServeStats();

  const aces = serves.filter((s) => s.result === 'ace').length;
  const errors = serves.filter((s) => s.result === 'error').length;
  const outOfPosition = serves.filter((s) => s.result === 'opponent_out_of_position').length;
  const inPosition = serves.filter((s) => s.result === 'opponent_in_position').length;
  const targeted = serves.filter((s) => s.targetedPlayer).length;

  return {
    totalServes: total,
    aces,
    errors,
    opponentInPosition: inPosition,
    opponentOutOfPosition: outOfPosition,
    aceRate: safeRate(aces, total),
    servePressureRate: safeRate(outOfPosition + aces, total),
    errorRate: safeRate(errors, total),
    tacticalSuccessRate: safeRate(targeted, total),
  };
}

export function computeReceptionStats(actions: RallyAction[], filters?: StatFilters): ReceptionStatistics {
  let receptions = actionsOfType<ReceptionAction>(actions, 'reception');
  if (filters?.playerNumber) {
    receptions = receptions.filter((r) => r.playerNumber === filters.playerNumber);
  }

  const total = receptions.length;
  if (total === 0) return emptyReceptionStats();

  const inPosition = receptions.filter((r) => r.quality === 1).length;
  const half = receptions.filter((r) => r.quality === 0.5).length;
  const out = receptions.filter((r) => r.quality === 0).length;

  return {
    totalReceptions: total,
    inPosition,
    halfInPosition: half,
    out,
    inPositionRate: safeRate(inPosition, total),
    outOfPositionRate: safeRate(out, total),
  };
}

export function computeSetStats(actions: RallyAction[], filters?: StatFilters): SetStatistics {
  let sets = actionsOfType<SetAction>(actions, 'set');
  if (filters?.playerNumber) {
    sets = sets.filter((s) => s.attackerNumber === filters.playerNumber);
  }

  const total = sets.length;
  if (total === 0) return emptySetStats();

  const inPosition = sets.filter((s) => s.quality === 'in_position').length;
  const half = sets.filter((s) => s.quality === 'half').length;
  const outOfPosition = sets.filter((s) => s.quality === 'out_of_position').length;

  const distribution: Record<number, number> = { 2: 0, 3: 0, 4: 0, 6: 0 };
  for (const s of sets) {
    if ([2, 3, 4, 6].includes(s.positionTo)) {
      distribution[s.positionTo] = (distribution[s.positionTo] || 0) + 1;
    }
  }

  // 拦网形成率: 从进攻动作中找
  const attacks = actionsOfType<AttackAction>(actions, 'attack');
  const blockFormed = attacks.filter((a) => a.opponentBlock === 'formed').length;

  return {
    totalSets: total,
    inPosition,
    half,
    outOfPosition,
    qualityRate: safeRate(inPosition, total),
    distributionByZone: distribution,
    position4Rate: safeRate(distribution[4], total),
    position2Rate: safeRate(distribution[2], total),
    position3Rate: safeRate(distribution[3], total),
    position6Rate: safeRate(distribution[6], total),
    blockFormationRate: safeRate(blockFormed, attacks.length),
  };
}

export function computeAttackStats(
  actions: RallyAction[],
  rallies: Rally[],
  filters?: StatFilters,
): AttackStatistics {
  let attacks = actionsOfType<AttackAction>(actions, 'attack');

  const total = attacks.length;
  if (total === 0) return emptyAttackStats();

  const scores = attacks.filter((a) => a.result === 'score').length;
  const concedes = attacks.filter((a) => a.result === 'concede').length;
  const blockedBack = attacks.filter((a) => a.result === 'blocked_back').length;
  const opponentHandled = attacks.filter((a) => a.result === 'opponent_handled').length;
  const opponentCounter = attacks.filter((a) => a.result === 'opponent_counter').length;

  // 按二传到位程度切分的进攻得分率
  // 需要找到每次进攻之前的二传动作
  let inPosAttacks = 0;
  let inPosScores = 0;
  let outPosAttacks = 0;
  let outPosScores = 0;
  let inPosEffective = 0;
  let outPosEffective = 0;

  for (const rally of rallies) {
    for (let i = 0; i < rally.actions.length; i++) {
      const action = rally.actions[i];
      if (action.type === 'attack') {
        // 找之前的 set 或 transition 动作
        let setQuality: string | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const prev = rally.actions[j];
          if (prev.type === 'set') {
            setQuality = prev.quality;
            break;
          }
          if (prev.type === 'transition') {
            setQuality = prev.secondTouchQuality;
            break;
          }
        }

        if (setQuality === 'in_position') {
          inPosAttacks++;
          if (action.result === 'score') inPosScores++;
          if (action.result === 'score' || action.result === 'opponent_handled') inPosEffective++;
        } else if (setQuality === 'half' || setQuality === 'out_of_position') {
          outPosAttacks++;
          if (action.result === 'score') outPosScores++;
          if (action.result === 'score' || action.result === 'opponent_handled') outPosEffective++;
        }
      }
    }
  }

  return {
    totalAttacks: total,
    scores,
    concedes,
    blockedBack,
    opponentHandled,
    opponentCounter,
    scoringRate: safeRate(scores, total),
    effectiveAttackRate: safeRate(scores + opponentHandled, total),
    scoringRateBySetQuality: {
      inPosition: safeRate(inPosScores, inPosAttacks),
      outOfPosition: safeRate(outPosScores, outPosAttacks),
    },
    effectiveRateBySetQuality: {
      inPosition: safeRate(inPosEffective, inPosAttacks),
      outOfPosition: safeRate(outPosEffective, outPosAttacks),
    },
  };
}

export function computeBlockDefenseStats(actions: RallyAction[], filters?: StatFilters): BlockDefenseStatistics {
  const blockDefs = actionsOfType<BlockDefenseAction>(actions, 'block_defense');
  const total = blockDefs.length;
  if (total === 0) return emptyBlockDefenseStats();

  const blockKills = blockDefs.filter((b) => b.blockEffect === 'block_kill').length;
  const effectiveTouches = blockDefs.filter((b) => b.blockEffect === 'effective_touch').length;
  const destructiveBlocks = blockDefs.filter((b) => b.blockEffect === 'destructive').length;
  const noBlockTouches = blockDefs.filter((b) => b.blockEffect === 'no_touch').length;

  return {
    totalBlockDefenses: total,
    blockKills,
    effectiveTouches,
    destructiveBlocks,
    noBlockTouches,
    effectiveBlockRate: safeRate(blockKills + effectiveTouches, total),
    destructiveBlockRate: safeRate(destructiveBlocks, total),
    noBlockRate: safeRate(noBlockTouches, total),
    inPositionDefense: blockDefs.filter((b) => b.defenseEffect === 'in_position').length,
    outOfPositionDefense: blockDefs.filter((b) => b.defenseEffect === 'out_of_position').length,
    notDug: blockDefs.filter((b) => b.defenseEffect === 'not_dug').length,
    noDefenseTouch: blockDefs.filter((b) => b.defenseEffect === 'no_touch').length,
    effectiveDefenseRate: safeRate(
      blockDefs.filter((b) => b.defenseEffect === 'in_position' || b.defenseEffect === 'out_of_position').length,
      total,
    ),
  };
}

export function computeTransitionStats(actions: RallyAction[]): TransitionStatistics {
  const transitions = actionsOfType<TransitionAction>(actions, 'transition');
  const total = transitions.length;
  if (total === 0) return emptyTransitionStats();

  const successful = transitions.filter((t) => t.blockProtection === 'successful').length;
  const failed = transitions.filter((t) => t.blockProtection === 'failed').length;
  const notAttempted = transitions.filter((t) => t.blockProtection === 'not_attempted').length;

  const inPos = transitions.filter((t) => t.secondTouchQuality === 'in_position').length;
  const half = transitions.filter((t) => t.secondTouchQuality === 'half').length;
  const outPos = transitions.filter((t) => t.secondTouchQuality === 'out_of_position').length;

  return {
    totalTransitions: total,
    successfulBlockProtection: successful,
    failedBlockProtection: failed,
    notAttemptedBlockProtection: notAttempted,
    blockProtectionSuccessRate: safeRate(successful, successful + failed),
    inPositionSecondTouch: inPos,
    halfSecondTouch: half,
    outOfPositionSecondTouch: outPos,
    secondTouchQualityRate: safeRate(inPos + half, total),
  };
}

export function computeMatchStatistics(
  rallies: Rally[],
  mode: MatchMode,
  filters?: StatFilters,
): MatchStatistics {
  const filtered = filterRallies(rallies, filters || {});
  const allActions = filtered.flatMap((r) => r.actions);
  const filteredActions = filterActionsByPlayer(allActions, filters?.playerNumber);

  return {
    serve: computeServeStats(filteredActions, filters),
    reception: computeReceptionStats(filteredActions, filters),
    set: computeSetStats(filteredActions, filters),
    attack: computeAttackStats(filteredActions, filtered, filters),
    blockDefense: computeBlockDefenseStats(filteredActions, filters),
    transition: mode === 'own' ? computeTransitionStats(filteredActions) : null,
    totalRallies: filtered.length,
    totalPointsScored: filtered.filter((r) => r.outcome === 'our_score').length,
    totalPointsConceded: filtered.filter((r) => r.outcome === 'their_score').length,
    rallyWinRate: safeRate(filtered.filter((r) => r.outcome === 'our_score').length, filtered.length),
  };
}
