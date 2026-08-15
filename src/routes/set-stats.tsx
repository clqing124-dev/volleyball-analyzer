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
  const [filterSide, setFilterSide] = useState<'serving' | 'receiving' | undefined>();
  const [rallyFrom, setRallyFrom] = useState<number | undefined>();
  const [rallyTo, setRallyTo] = useState<number | undefined>();
  const [filterAttackLine, setFilterAttackLine] = useState<string | undefined>();
  const [filterAttackType, setFilterAttackType] = useState<string | undefined>();
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
      if (filterSide) filters.side = filterSide;
      if (rallyFrom !== undefined) filters.rallyNumberFrom = rallyFrom;
      if (rallyTo !== undefined) filters.rallyNumberTo = rallyTo;
      if (filterAttackLine) filters.attackLine = filterAttackLine;
      if (filterAttackType) filters.attackType = filterAttackType;
      setStats(computeMatchStatistics(rallies, match.type, filters));
    }
  }, [rallies, match, filterPlayer, filterSide, rallyFrom, rallyTo, filterAttackLine, filterAttackType]);

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

      <div className="px-4 py-2 flex gap-2 items-center flex-wrap">
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
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-400">第</span>
          <input type="number" min={1} value={rallyFrom ?? ''} placeholder="起"
            onChange={(e) => setRallyFrom(e.target.value ? Number(e.target.value) : undefined)}
            className="w-14 bg-slate-800 rounded-lg px-2 py-2 text-sm text-white outline-none" />
          <span className="text-slate-400">-</span>
          <input type="number" min={1} value={rallyTo ?? ''} placeholder="止"
            onChange={(e) => setRallyTo(e.target.value ? Number(e.target.value) : undefined)}
            className="w-14 bg-slate-800 rounded-lg px-2 py-2 text-sm text-white outline-none" />
          <span className="text-slate-400">分</span>
        </div>
        <select value={filterAttackLine || ''} onChange={(e) => setFilterAttackLine(e.target.value || undefined)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="">进攻线路</option>
          <option value="middle">中线</option>
          <option value="cross">大斜线</option>
          <option value="big_cross">二直线</option>
          <option value="small_cross">小斜线</option>
          <option value="second_straight">腰线</option>
          <option value="straight">直线</option>
        </select>
        <select value={filterAttackType || ''} onChange={(e) => setFilterAttackType(e.target.value || undefined)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="">进攻方式</option>
          <option value="attack">进攻</option>
          <option value="tip">吊球</option>
          <option value="handle">处理</option>
          <option value="recover">回收</option>
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
