// ============================================================
// match-store.ts — 比赛列表和CRUD管理
// ============================================================

import { create } from 'zustand';
import type { Match, Player, SetData } from '@/types';
import { db } from '@/db/volleyball-db';
import { v4 as uuid } from 'uuid';

interface CreateMatchData {
  type: Match['type'];
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  players: Omit<Player, 'id' | 'matchId'>[];
}

interface MatchStore {
  matches: Match[];
  loading: boolean;

  loadMatches: () => Promise<void>;
  createMatch: (data: CreateMatchData) => Promise<Match>;
  getMatch: (id: string) => Promise<Match | undefined>;
  deleteMatch: (id: string) => Promise<void>;
  addSet: (matchId: string, setNumber: number) => Promise<SetData>;
  updateMatch: (id: string, updates: Partial<Match>) => Promise<void>;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matches: [],
  loading: false,

  loadMatches: async () => {
    set({ loading: true });
    try {
      const matches = await db.matches.orderBy('updatedAt').reverse().toArray();
      for (const match of matches) {
        match.sets = await db.sets.where('matchId').equals(match.id).toArray();
      }
      set({ matches, loading: false });
    } catch (e) {
      console.error('Failed to load matches:', e);
      set({ loading: false });
    }
  },

  createMatch: async (data) => {
    const now = Date.now();
    const matchId = uuid();

    // 创建球员，带上 matchId
    const players: Player[] = data.players.map((p) => ({
      ...p,
      id: uuid(),
      matchId,
    }));

    const match: Match = {
      id: matchId,
      type: data.type,
      homeTeamName: data.homeTeamName,
      awayTeamName: data.awayTeamName,
      date: data.date,
      players,
      sets: [],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local',
    };

    await db.matches.add(match);
    // 保存球员到独立表（带 matchId）
    for (const player of players) {
      await db.players.add(player);
    }

    set((state) => ({ matches: [match, ...state.matches] }));
    return match;
  },

  getMatch: async (id) => {
    const match = await db.matches.get(id as any);
    if (match) {
      match.sets = await db.sets.where('matchId').equals(id).toArray();
      // 只加载本场比赛的球员
      match.players = await db.players.where('matchId').equals(id).toArray();
    }
    return match;
  },

  deleteMatch: async (id) => {
    await db.matches.delete(id as any);
    await db.sets.where('matchId').equals(id).delete();
    await db.rallies.where('matchId').equals(id).delete();
    await db.players.where('matchId').equals(id).delete();
    set((state) => ({ matches: state.matches.filter((m) => m.id !== id) }));
  },

  addSet: async (matchId, setNumber) => {
    const setId = uuid();
    const setData: SetData = {
      id: setId,
      matchId,
      setNumber,
      rallies: [],
      isCompleted: false,
      ourScore: 0,
      opponentScore: 0,
      targetScore: setNumber === 5 ? 15 : 25,
      createdAt: Date.now(),
    };

    await db.sets.add(setData);

    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId
          ? { ...m, sets: [...m.sets, setData], updatedAt: Date.now() }
          : m
      ),
    }));

    return setData;
  },

  updateMatch: async (id, updates) => {
    await db.matches.update(id as any, { ...updates, updatedAt: Date.now() });
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
      ),
    }));
  },
}));
