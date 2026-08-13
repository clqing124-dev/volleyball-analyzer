// ============================================================
// volleyball-db.ts — Dexie.js 数据库定义
// ============================================================

import Dexie, { type Table } from 'dexie';
import type { Match, SetData, Rally, Player, SyncQueueItem } from '@/types';

export class VolleyballDB extends Dexie {
  matches!: Table<Match, 'id'>;
  sets!: Table<SetData, 'id'>;
  rallies!: Table<Rally, 'id'>;
  players!: Table<Player, 'id'>;
  syncQueue!: Table<SyncQueueItem, 'id'>;

  constructor() {
    super('VolleyballAnalyzer');

    this.version(2).stores({
      matches: 'id, type, date, syncStatus, updatedAt',
      sets: 'id, matchId, setNumber',
      rallies: 'id, setId, matchId, rallyNumber',
      players: 'id, matchId, jerseyNumber',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
    });

    // Hook: 写入后自动加入同步队列
    this.matches.hook('creating', (_primKey, obj) => {
      this.enqueueSync('match', obj.id, 'create');
    });
    this.matches.hook('updating', (_mods, _primKey, obj) => {
      this.enqueueSync('match', obj.id, 'update');
    });

    this.sets.hook('creating', (_primKey, obj) => {
      this.enqueueSync('set', obj.id, 'create');
    });
    this.sets.hook('updating', (_mods, _primKey, obj) => {
      this.enqueueSync('set', obj.id, 'update');
    });

    this.rallies.hook('creating', (_primKey, obj) => {
      this.enqueueSync('rally', obj.id, 'create');
    });
    this.rallies.hook('updating', (_mods, _primKey, obj) => {
      this.enqueueSync('rally', obj.id, 'update');
    });
  }

  private async enqueueSync(
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    operation: 'create' | 'update'
  ) {
    try {
      await this.syncQueue.add({
        entityType,
        entityId,
        operation,
        createdAt: Date.now(),
        attempts: 0,
      });
    } catch {
      // 静默失败，同步队列不是关键路径
    }
  }
}

export const db = new VolleyballDB();
