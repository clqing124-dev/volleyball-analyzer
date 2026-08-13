// ============================================================
// SetStatsPage — 单局统计分析页
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import { computeMatchStatistics } from '@/engine';
import type { MatchMode, Rally } from '@/types';
import type { MatchStatistics, StatFilters } from '@/types/stats';
import type { ReceptionQuality } from '@/types/actions';

function StatCard({ label, value, unit = '', sub = '' }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}{unit}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatPct(n: number): string {
  return (n * 100).toFixed(1);
}

export function SetStatsPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [stats, setStats] = useState<MatchStatistics | null>(null);
  const [filterPlayer, setFilterPlayer] = useState<number | undefined>();
  const [filterQuality, setFilterQuality] = useState<ReceptionQuality | undefined>();
  const [activeTab, setActiveTab] = useState<string>('serve');

  useEffect(() => {
    if (!matchId || !setId) return;
    getMatch(matchId).then((m) => {
      setMatch(m);
    });
    db.rallies.where('setId').equals(setId).toArray().then((r) => {
      setRallies(r);
    });
  }, [matchId, setId]);

  useEffect(() => {
    if (rallies.length > 0 && match) {
      const filters: StatFilters = {};
      if (filterPlayer) filters.playerNumber = filterPlayer;
      if (filterQuality !== undefined) filters.minReceptionQuality = filterQuality;

      const result = computeMatchStatistics(rallies, match.type, filters);
      setStats(result);
    }
  }, [rallies, match, filterPlayer, filterQuality]);

  if (!match || !stats) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  const setInfo = match.sets.find((s: any) => s.id === setId);
  const tabs = match.type === 'own'
    ? ['serve', 'reception', 'set', 'attack', 'block_defense', 'transition']
    : ['serve', 'reception', 'set', 'attack', 'block_defense'];

  const tabLabels: Record<string, string> = {
    serve: '发球', reception: '一传', set: '二传',
    attack: '进攻', block_defense: '拦防', transition: '串联',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/match/${matchId}`)} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">
            第 {setInfo?.setNumber} 局统计
          </h1>
          <p className="text-sm text-slate-400">
            {setInfo?.ourScore} - {setInfo?.opponentScore} · {rallies.length} 回合
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex gap-2 items-center">
        {match.players?.length > 0 && (
          <select
            value={filterPlayer || ''}
            onChange={(e) => setFilterPlayer(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">全部球员</option>
            {match.players.map((p: any) => (
              <option key={p.jerseyNumber} value={p.jerseyNumber}>
                {p.jerseyNumber}号 {p.name || ''}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterQuality !== undefined ? filterQuality : ''}
          onChange={(e) => setFilterQuality(e.target.value ? Number(e.target.value) as ReceptionQuality : undefined)}
          className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
        >
          <option value="">全部到位程度</option>
          <option value="1">一传到位</option>
          <option value="0.5">一传半到位</option>
          <option value="0">一传不到位</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-1 overflow-x-auto border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400'
              }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Stats Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'serve' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">发球分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="发球总数" value={String(stats.serve.totalServes)} />
              <StatCard label="ACE得分率" value={formatPct(stats.serve.aceRate)} unit="%" sub={`${stats.serve.aces}球`} />
              <StatCard label="发球破攻率" value={formatPct(stats.serve.servePressureRate)} unit="%" sub={`对方不到位${stats.serve.opponentOutOfPosition}球`} />
              <StatCard label="发球失误率" value={formatPct(stats.serve.errorRate)} unit="%" sub={`${stats.serve.errors}球`} />
            </div>
            {match.type === 'own' && (
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="战术发球成功率" value={formatPct(stats.serve.tacticalSuccessRate)} unit="%" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'reception' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">一传分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="一传总数" value={String(stats.reception.totalReceptions)} />
              <StatCard label="到位率" value={formatPct(stats.reception.inPositionRate)} unit="%" sub={`${stats.reception.inPosition}球`} />
              <StatCard label="半到位" value={String(stats.reception.halfInPosition)} />
              <StatCard label="不到位率" value={formatPct(stats.reception.outOfPositionRate)} unit="%" sub={`${stats.reception.out}球`} />
            </div>
          </div>
        )}

        {activeTab === 'set' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">二传分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="传球总数" value={String(stats.set.totalSets)} />
              <StatCard label="到位率" value={formatPct(stats.set.qualityRate)} unit="%" />
              <StatCard label="传4号位率" value={formatPct(stats.set.position4Rate)} unit="%" />
              <StatCard label="传2号位率" value={formatPct(stats.set.position2Rate)} unit="%" />
              <StatCard label="传3号位率" value={formatPct(stats.set.position3Rate)} unit="%" />
              <StatCard label="传6号位率" value={formatPct(stats.set.position6Rate)} unit="%" />
              <StatCard label="拦网形成率" value={formatPct(stats.set.blockFormationRate)} unit="%" />
            </div>
          </div>
        )}

        {activeTab === 'attack' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">进攻分析</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="进攻总数" value={String(stats.attack.totalAttacks)} />
              <StatCard label="得分率" value={formatPct(stats.attack.scoringRate)} unit="%" sub={`${stats.attack.scores}分`} />
              <StatCard label="有效进攻率" value={formatPct(stats.attack.effectiveAttackRate)} unit="%" />
              <StatCard label="被拦回" value={String(stats.attack.blockedBack)} />
              <StatCard label="对方处理" value={String(stats.attack.opponentHandled)} />
              <StatCard label="对方反击" value={String(stats.attack.opponentCounter)} />
            </div>
            {match.type === 'own' && (
              <>
                <h4 className="text-sm font-semibold text-slate-400 mt-4">按二传到位程度</h4>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="到位球得分率" value={formatPct(stats.attack.scoringRateBySetQuality.inPosition)} unit="%" />
                  <StatCard label="不到位球得分率" value={formatPct(stats.attack.scoringRateBySetQuality.outOfPosition)} unit="%" />
                  <StatCard label="到位有效进攻率" value={formatPct(stats.attack.effectiveRateBySetQuality.inPosition)} unit="%" />
                  <StatCard label="不到位有效进攻率" value={formatPct(stats.attack.effectiveRateBySetQuality.outOfPosition)} unit="%" />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'block_defense' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">拦防分析</h3>
            <h4 className="text-sm font-semibold text-slate-400">拦网</h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="拦网总数" value={String(stats.blockDefense.totalBlockDefenses)} />
              <StatCard label="有效拦网率" value={formatPct(stats.blockDefense.effectiveBlockRate)} unit="%" sub={`拦死${stats.blockDefense.blockKills}+撑起${stats.blockDefense.effectiveTouches}`} />
              <StatCard label="破坏性拦网率" value={formatPct(stats.blockDefense.destructiveBlockRate)} unit="%" />
              <StatCard label="未形成拦网率" value={formatPct(stats.blockDefense.noBlockRate)} unit="%" />
            </div>
            <h4 className="text-sm font-semibold text-slate-400 mt-4">防守</h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="有效防守率" value={formatPct(stats.blockDefense.effectiveDefenseRate)} unit="%" sub={`到位${stats.blockDefense.inPositionDefense}+不到位${stats.blockDefense.outOfPositionDefense}`} />
              <StatCard label="未防起" value={String(stats.blockDefense.notDug)} />
              <StatCard label="未触球" value={String(stats.blockDefense.noDefenseTouch)} />
            </div>
          </div>
        )}

        {activeTab === 'transition' && stats.transition && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold mb-3">串联分析</h3>
            <h4 className="text-sm font-semibold text-slate-400">拦回保护</h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="串联总数" value={String(stats.transition.totalTransitions)} />
              <StatCard label="保护成功率" value={formatPct(stats.transition.blockProtectionSuccessRate)} unit="%" />
              <StatCard label="保护成功" value={String(stats.transition.successfulBlockProtection)} />
              <StatCard label="保护失败" value={String(stats.transition.failedBlockProtection)} />
            </div>
            <h4 className="text-sm font-semibold text-slate-400 mt-4">第二下触球</h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="到位率" value={formatPct(stats.transition.secondTouchQualityRate)} unit="%" sub={`到位${stats.transition.inPositionSecondTouch}+半到位${stats.transition.halfSecondTouch}`} />
              <StatCard label="不到位" value={String(stats.transition.outOfPositionSecondTouch)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
