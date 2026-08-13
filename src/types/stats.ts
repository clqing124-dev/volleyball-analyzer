// ============================================================
// stats.ts — 统计指标输出类型
// ============================================================

export interface ServeStatistics {
  totalServes: number;
  aces: number;
  errors: number;
  opponentInPosition: number;
  opponentOutOfPosition: number;
  aceRate: number;
  servePressureRate: number;
  errorRate: number;
  tacticalSuccessRate: number;  // 发到追发人 (己方)
}

export interface ReceptionStatistics {
  totalReceptions: number;
  inPosition: number;
  halfInPosition: number;
  out: number;
  inPositionRate: number;
  outOfPositionRate: number;
}

export interface SetStatistics {
  totalSets: number;
  inPosition: number;
  half: number;
  outOfPosition: number;
  qualityRate: number;
  distributionByZone: Record<number, number>;
  position4Rate: number;
  position2Rate: number;
  position3Rate: number;
  position6Rate: number;
  blockFormationRate: number;
}

export interface AttackStatistics {
  totalAttacks: number;
  scores: number;
  concedes: number;
  blockedBack: number;
  opponentHandled: number;
  opponentCounter: number;
  scoringRate: number;
  effectiveAttackRate: number;
  scoringRateBySetQuality: {
    inPosition: number;
    outOfPosition: number;
  };
  effectiveRateBySetQuality: {
    inPosition: number;
    outOfPosition: number;
  };
}

export interface BlockDefenseStatistics {
  totalBlockDefenses: number;
  blockKills: number;
  effectiveTouches: number;
  destructiveBlocks: number;
  noBlockTouches: number;
  effectiveBlockRate: number;
  destructiveBlockRate: number;
  noBlockRate: number;
  inPositionDefense: number;
  outOfPositionDefense: number;
  notDug: number;
  noDefenseTouch: number;
  effectiveDefenseRate: number;
}

export interface TransitionStatistics {
  totalTransitions: number;
  successfulBlockProtection: number;
  failedBlockProtection: number;
  notAttemptedBlockProtection: number;
  blockProtectionSuccessRate: number;
  inPositionSecondTouch: number;
  halfSecondTouch: number;
  outOfPositionSecondTouch: number;
  secondTouchQualityRate: number;
}

export interface MatchStatistics {
  serve: ServeStatistics;
  reception: ReceptionStatistics;
  set: SetStatistics;
  attack: AttackStatistics;
  blockDefense: BlockDefenseStatistics;
  transition: TransitionStatistics | null;
  totalRallies: number;
  totalPointsScored: number;
  totalPointsConceded: number;
  rallyWinRate: number;
}

export interface StatFilters {
  playerNumber?: number;
  minReceptionQuality?: 0 | 0.5 | 1;
}
