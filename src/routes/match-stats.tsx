// ============================================================
// MatchStatsPage — 全场比赛分析页
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import { computeMatchStatistics } from '@/engine';
import type { Rally } from '@/types';
import type { MatchStatistics, StatFilters } from '@/types/stats';
import {
  StatCard, pct, ServeSection, ReceptionSection, SetSection, AttackSection, BlockDefenseTransitionSection,
} from '@/components/stats/stat-sections';

export function MatchStatsPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [stats, setStats] = useState<MatchStatistics | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<number | undefined>();
  const [selectedSet, setSelectedSet] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<'serving' | 'receiving' | undefined>();
  const [activeTab, setActiveTab] = useState<string>('serve');

  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId).then((m) => setMatch(m));
    db.rallies.where('matchId').equals(matchId).toArray().then((r) => setRallies(r));
  }, [matchId]);

  useEffect(() => {
    if (rallies.length > 0 && match) {
      let filtered = rallies;
      if (selectedSet !== 'all') filtered = rallies.filter((r) => r.setId === selectedSet);
      const filters: StatFilters = {};
      if (filterPlayer) filters.playerNumber = filterPlayer;
      if (filterSide) filters.side = filterSide;
      setStats(computeMatchStatistics(filtered, match.type, filters));
    }
  }, [rallies, match, filterPlayer, selectedSet, filterSide]);

  if (!match || !stats) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  const totalOur = match.sets?.reduce((s: number, x: any) => s + x.ourScore, 0) || 0;
  const totalOpp = match.sets?.reduce((s: number, x: any) => s + x.opponentScore, 0) || 0;

  const tabs = ['serve', 'reception', 'set', 'attack', 'block_defense_transition'];
  const tabLabels: Record<string, string> = {
    serve: '发球', reception: '一传', set: '二传', attack: '进攻', block_defense_transition: '拦防串联',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/match/${matchId}`)} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">全场分析</h1>
          <p className="text-sm text-slate-400">{match.homeTeamName} vs {match.awayTeamName} · {totalOur}-{totalOpp}</p>
        </div>
      </div>

      <div className="px-4 py-2 flex gap-2 items-center flex-wrap">
        <select value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="all">全部局</option>
          {match.sets?.map((s: any) => <option key={s.id} value={s.id}>第{s.setNumber}局</option>)}
        </select>
        {match.players?.length > 0 && (
          <select value={filterPlayer || ''} onChange={(e) => setFilterPlayer(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="">全部球员</option>
            {match.players.map((p: any) => (
              <option key={p.jerseyNumber} value={p.jerseyNumber}>{p.jerseyNumber}号 {p.name || ''}</option>
            ))}
          </select>
        )}
        <select value={filterSide || ''} onChange={(e) => setFilterSide((e.target.value || undefined) as any)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="">接球/发球</option>
          <option value="serving">发球方</option>
          <option value="receiving">接球方</option>
        </select>
      </div>

      <div className="px-4 pb-2">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="总回合" value={String(stats.totalRallies)} />
          <StatCard label="得分" value={String(stats.totalPointsScored)} />
          <StatCard label="失分" value={String(stats.totalPointsConceded)} />
          <StatCard label="得分率" value={pct(stats.rallyWinRate)} unit="%" />
        </div>
      </div>

      <div className="px-4 flex gap-1 overflow-x-auto border-b border-slate-800">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400'}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'serve' && <ServeSection stats={stats} />}
        {activeTab === 'reception' && <ReceptionSection stats={stats} />}
        {activeTab === 'set' && <SetSection stats={stats} />}
        {activeTab === 'attack' && <AttackSection stats={stats} />}
        {activeTab === 'block_defense_transition' && <BlockDefenseTransitionSection stats={stats} />}
      </div>
    </div>
  );
}
