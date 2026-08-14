// ============================================================
// domain.ts — 核心领域类型：Match, Set, Rally, Player
// ============================================================

import type { RallyAction } from './actions';

export type MatchMode = 'own' | 'opponent';
// 'own'     = 己方分析
// 'opponent' = 对手分析

export interface Player {
  id: string;
  matchId: string;              // 所属比赛
  jerseyNumber: number;         // 1-99
  name?: string;
  position?: string;            // 位置：主攻/副攻/二传/接应/自由人
}

// ============================================================
// Set
// ============================================================

export interface SetData {
  id: string;
  matchId: string;
  setNumber: number;            // 1-5
  rallies: Rally[];
  isCompleted: boolean;
  ourScore: number;
  opponentScore: number;
  targetScore: number;          // 25 (15 for set 5)
  createdAt: number;
}

// ============================================================
// Rally
// ============================================================

export type RallySide = 'serving' | 'receiving';
export type RallyOutcome = 'our_score' | 'their_score';

export interface Substitution {
  playerIn: number;   // 换上球员号
  playerOut: number;  // 换下球员号
}

export interface Rally {
  id: string;
  setId: string;
  matchId: string;
  rallyNumber: number;
  side: RallySide;              // 我方是否发球方
  actions: RallyAction[];       // 按时间顺序
  outcome: RallyOutcome;
  homeScoreAfter: number;       // 此回合后的我方得分
  awayScoreAfter: number;       // 此回合后的对方得分
  timeout: boolean;             // 该分后是否出现暂停
  substitutions: Substitution[]; // 该分后是否出现换人
  timestamp: number;
}

// ============================================================
// Match
// ============================================================

export type SyncStatus = 'local' | 'synced' | 'modified';

export interface Match {
  id: string;
  type: MatchMode;
  homeTeamName: string;         // 我方队名
  awayTeamName: string;         // 对方队名
  date: string;                 // ISO date YYYY-MM-DD
  players: Player[];
  sets: SetData[];
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

// ============================================================
// Sync metadata
// ============================================================

export interface SyncQueueItem {
  id?: number;
  entityType: 'match' | 'set' | 'rally' | 'player';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  createdAt: number;
  attempts: number;
  lastError?: string;
}
