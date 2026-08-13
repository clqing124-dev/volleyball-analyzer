// ============================================================
// SetStatsPage — 单局统计分析页
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
  ServeSection, ReceptionSection, SetSection, AttackSection, BlockDefenseTransitionSection,
} from '@/components/stats/stat-sections';

export function SetStatsPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [stats, setStats] = useState<MatchStatistics | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<number | undefined>();
  const [filterQuality, setFilterQuality] = useState<'in' | 'half' | 'out' | undefined>();
  const [activeTab, setActiveTab] = useState<string>('serve');

  useEffect(() => {
    if (!matchId || !setId) return;
    getMatch(matchId).then((m) => setMatch(m));
    db.rallies.where('setId').equals(setId).toArray().then((r) => setRallies(r));
  }, [matchId, setId]);

  useEffect(() => {
    if (rallies.length > 0 && match) {
      const filters: StatFilters = {};
      if (filterPlayer) filters.playerNumber = filterPlayer;
      if (filterQuality) filters.minReceptionQuality = filterQuality;
      setStats(computeMatchStatistics(rallies, match.type, filters));
    }
  }, [rallies, match, filterPlayer, filterQuality]);

  if (!match || !stats) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  const setInfo = match.sets?.find((s: any) => s.id === setId);
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
          <h1 className="text-lg font-bold">第 {setInfo?.setNumber} 局统计</h1>
          <p className="text-sm text-slate-400">{setInfo?.ourScore} - {setInfo?.opponentScore} · {rallies.length} 回合</p>
        </div>
      </div>

      <div className="px-4 py-2 flex gap-2 items-center">
        {match.players?.length > 0 && (
          <select value={filterPlayer || ''} onChange={(e) => setFilterPlayer(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="">全部球员</option>
            {match.players.map((p: any) => (
              <option key={p.jerseyNumber} value={p.jerseyNumber}>{p.jerseyNumber}号 {p.name || ''}</option>
            ))}
          </select>
        )}
        <select value={filterQuality || ''} onChange={(e) => setFilterQuality((e.target.value || undefined) as any)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="">全部一传</option>
          <option value="in">一传到位</option>
          <option value="half">一传半到位及以上</option>
          <option value="out">全部</option>
        </select>
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
