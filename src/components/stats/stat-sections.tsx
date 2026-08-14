// ============================================================
// stat-sections.tsx — 共享统计展示区块
// ============================================================

import type { MatchStatistics } from '@/types/stats';

export function StatCard({ label, value, unit = '', sub = '' }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}{unit}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function pct(n: number): string {
  return (n * 100).toFixed(1);
}

export function ServeSection({ stats }: { stats: MatchStatistics }) {
  const s = stats.serve;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold mb-3">发球分析</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="发球总数" value={String(s.totalServes)} />
        <StatCard label="发球得分率" value={pct(s.scoreRate)} unit="%" sub={`${s.scores}球`} />
        <StatCard label="发球破攻率" value={pct(s.breakRate)} unit="%" sub={`对方不到位${s.outOfPosition}球`} />
        <StatCard label="发球失误率" value={pct(s.errorRate)} unit="%" sub={`${s.concedes}球`} />
        <StatCard label="发球效能指数" value={s.efficiencyIndex.toFixed(2)} sub="得分×3+破攻×1-失误×4 /总" />
        <StatCard label="战术发球成功率" value={pct(s.tacticalSuccessRate)} unit="%" sub={`追发${s.targetedCount}球`} />
      </div>
    </div>
  );
}

export function ReceptionSection({ stats }: { stats: MatchStatistics }) {
  const r = stats.reception;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold mb-3">一传分析</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="一传总数" value={String(r.totalReceptions)} />
        <StatCard label="一传到位率" value={pct(r.inPositionRate)} unit="%" sub={`${r.inPosition}球`} />
        <StatCard label="一传不到位率" value={pct(r.outOfPositionRate)} unit="%" sub={`不到位${r.outOfPosition}球`} />
        <StatCard label="一传失误率" value={pct(r.errorRate)} unit="%" sub={`丢分${r.concedes}+接过去${r.toOpponent}球`} />
      </div>
    </div>
  );
}

export function SetSection({ stats }: { stats: MatchStatistics }) {
  const s = stats.set;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold mb-3">二传分析（一攻）</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="传球总数" value={String(s.totalSets)} />
        <StatCard label="传球到位率" value={pct(s.qualityRate)} unit="%" />
        <StatCard label="传4号位率" value={pct(s.position4Rate)} unit="%" sub={`${s.distributionByZone[4]}次`} />
        <StatCard label="传2号位率" value={pct(s.position2Rate)} unit="%" sub={`${s.distributionByZone[2]}次`} />
        <StatCard label="传3号位率" value={pct(s.position3Rate)} unit="%" sub={`${s.distributionByZone[3]}次`} />
        <StatCard label="传6号位率" value={pct(s.position6Rate)} unit="%" sub={`${s.distributionByZone[6]}次`} />
        <StatCard label="一攻拦网形成率" value={pct(s.blockFormationRate)} unit="%" />
      </div>
    </div>
  );
}

export function AttackSection({ stats }: { stats: MatchStatistics }) {
  const a = stats.attack;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold mb-3">进攻分析</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="进攻总数" value={String(a.totalAttacks)} />
        <StatCard label="进攻效率" value={(a.efficiency * 100).toFixed(1)} unit="%" sub="(得分-丢分)/总" />
        <StatCard label="一攻得分率" value={pct(a.firstAttackScoreRate)} unit="%" />
        <StatCard label="防反得分率" value={pct(a.counterAttackScoreRate)} unit="%" />
      </div>
      <h4 className="text-sm font-semibold text-slate-400 mt-3">按传球到位程度</h4>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="到位球得分率" value={pct(a.scoringRateBySetQuality.in)} unit="%" />
        <StatCard label="不到位球得分率" value={pct(a.scoringRateBySetQuality.out)} unit="%" />
        <StatCard label="到位有效进攻率" value={pct(a.effectiveRateBySetQuality.in)} unit="%" />
        <StatCard label="不到位有效进攻率" value={pct(a.effectiveRateBySetQuality.out)} unit="%" />
      </div>
    </div>
  );
}

export function BlockDefenseTransitionSection({ stats }: { stats: MatchStatistics }) {
  const b = stats.blockDefenseTransition;
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold mb-3">拦防串联分析</h3>
      <h4 className="text-sm font-semibold text-slate-400">拦网（去掉"无"）</h4>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="拦网总数" value={String(b.totalBlocks)} />
        <StatCard label="有效拦网率" value={pct(b.effectiveBlockRate)} unit="%" sub={`拦死${b.blockKills}+撑起${b.effectiveTouches}`} />
        <StatCard label="破坏性拦网率" value={pct(b.destructiveBlockRate)} unit="%" />
        <StatCard label="未形成并拦率" value={pct(b.noBlockRate)} unit="%" />
      </div>
      <h4 className="text-sm font-semibold text-slate-400 mt-3">第一次触球</h4>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="有效率" value={pct(b.firstTouchEffectiveRate)} unit="%" sub={`${b.totalFirstTouch}球`} />
        <StatCard label="到位率" value={pct(b.firstTouchInRate)} unit="%" />
      </div>
      <h4 className="text-sm font-semibold text-slate-400 mt-3">第二次触球（不含得分/丢分）</h4>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="到位率" value={pct(b.secondTouchInRate)} unit="%" sub={`${b.totalSecondTouch}球`} />
        <StatCard label="传1号位率" value={pct(b.secondTouchPosRates[1])} unit="%" />
        <StatCard label="传2号位率" value={pct(b.secondTouchPosRates[2])} unit="%" />
        <StatCard label="传3号位率" value={pct(b.secondTouchPosRates[3])} unit="%" />
        <StatCard label="传4号位率" value={pct(b.secondTouchPosRates[4])} unit="%" />
        <StatCard label="传6号位率" value={pct(b.secondTouchPosRates[6])} unit="%" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <StatCard label="防反拦网形成率" value={pct(b.counterBlockFormationRate)} unit="%" />
      </div>
    </div>
  );
}
