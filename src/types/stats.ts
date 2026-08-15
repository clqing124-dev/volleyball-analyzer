// ============================================================
// stats.ts — 统计指标输出类型（重构版）
// ============================================================

export interface ServeStatistics {
  totalServes: number;
  scores: number;
  outOfPosition: number;
  concedes: number;
  targetedCount: number;
  scoreRate: number;            // 发球得分率
  breakRate: number;            // 发球破攻率
  errorRate: number;            // 发球失误率
  efficiencyIndex: number;      // 发球效能指数
  tacticalSuccessRate: number;  // 战术发球成功率
}

export interface ReceptionStatistics {
  totalReceptions: number;
  inPosition: number;
  outOfPosition: number;        // 不到位
  toOpponent: number;           // 接到对面
  concedes: number;
  inPositionRate: number;       // 一传到位率
  outOfPositionRate: number;    // 一传不到位率
  errorRate: number;            // 一传失误率（丢分+接到对面）
}

export interface SetStatistics {
  totalSets: number;
  inPosition: number;
  qualityRate: number;          // 传球到位率
  distributionByZone: Record<number, number>;
  position4Rate: number;
  position2Rate: number;
  position3Rate: number;
  position6Rate: number;
  blockFormationRate: number;   // 一攻拦网形成率
}

export interface AttackStatistics {
  totalAttacks: number;
  scores: number;
  concedes: number;
  opponentHandled: number;
  // 到位/不到位切分
  scoringRateBySetQuality: { in: number; out: number };
  effectiveRateBySetQuality: { in: number; out: number };
  efficiency: number;           // 进攻效率
  firstAttackScoreRate: number; // 一攻得分率
  counterAttackScoreRate: number; // 防反得分率
}

export interface BlockDefenseTransitionStatistics {
  totalBlocks: number;          // 去掉 blockEffect=none 后的拦网总数
  blockKills: number;
  effectiveTouches: number;
  destructive: number;
  noEffectiveTouch: number;
  effectiveBlockRate: number;   // 有效拦网率
  destructiveBlockRate: number; // 破坏性拦网率
  noBlockRate: number;          // 未形成拦网率
  // 第一次触球
  totalFirstTouch: number;
  firstTouchEffectiveRate: number; // 第一次触球有效率
  firstTouchInRate: number;        // 第一次触球到位率
  // 第二次触球（不含得分/丢分）
  totalSecondTouch: number;
  secondTouchInRate: number;       // 第二次触球到位率（到位+半到位）
  secondTouchDistribution: Record<number, number>; // 传1/2/3/4/6号位
  secondTouchPosRates: Record<number, number>;
  // 非一攻拦网形成率
  counterBlockFormationRate: number;
}

export interface MatchStatistics {
  serve: ServeStatistics;
  reception: ReceptionStatistics;
  set: SetStatistics;
  attack: AttackStatistics;
  blockDefenseTransition: BlockDefenseTransitionStatistics;
  totalRallies: number;
  totalPointsScored: number;
  totalPointsConceded: number;
  rallyWinRate: number;
}

export interface StatFilters {
  playerNumber?: number;
  side?: 'serving' | 'receiving';  // 接球/发球维度
  rallyNumberFrom?: number;        // 第几分到第几分（含）
  rallyNumberTo?: number;          // 第几分到第几分（含）
  attackLine?: string;             // 进攻线路维度
  attackType?: string;             // 进攻方式维度
}
