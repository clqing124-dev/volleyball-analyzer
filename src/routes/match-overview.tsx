// ============================================================
// MatchOverviewPage — 比赛详情：各局概览 + 操作入口
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Plus, BarChart3, Trash2 } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import type { Match, Rally } from '@/types';

export function MatchOverviewPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { getMatch, addSet, deleteSet } = useMatchStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    getMatch(matchId).then((m) => {
      setMatch(m || null);
      setLoading(false);
    });
    db.rallies.where('matchId').equals(matchId).toArray().then((r) => setRallies(r));
  }, [matchId, getMatch]);

  const handleStartSet = async () => {
    if (!match) return;
    const nextSetNumber = match.sets.length + 1;
    if (nextSetNumber > 5) return;

    const setData = await addSet(match.id, nextSetNumber);
    navigate(`/match/${match.id}/set/${setData.id}/record`);
  };

  const handleContinueSet = (setId: string) => {
    if (!match) return;
    navigate(`/match/${match.id}/set/${setId}/record`);
  };

  const handleDeleteSet = async (setId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!match) return;
    if (confirm('确定删除这一局吗？该局所有回合数据都会丢失，此操作不可恢复。')) {
      await deleteSet(match.id, setId);
      const updated = await getMatch(match.id);
      setMatch(updated || null);
      db.rallies.where('matchId').equals(match.id).toArray().then((r) => setRallies(r));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        加载中...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
        <p>比赛不存在</p>
        <button onClick={() => navigate('/')} className="text-primary-400">返回首页</button>
      </div>
    );
  }

  const totalOurScore = match.sets.reduce((sum, s) => sum + s.ourScore, 0);
  const totalOppScore = match.sets.reduce((sum, s) => sum + s.opponentScore, 0);
  const canAddSet = match.sets.length < 5;
  const currentSet = match.sets.find((s) => !s.isCompleted);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">
            {match.homeTeamName} vs {match.awayTeamName}
          </h1>
          <p className="text-sm text-slate-400">
            {match.type === 'own' ? '己方分析' : '对手分析'} · {match.date}
          </p>
        </div>
      </div>

      {/* Score Summary */}
      <div className="px-4 py-3">
        <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">{match.homeTeamName}{match.type === 'opponent' ? '(分析对象)' : '(我方)'}</p>
            <p className="text-4xl font-bold">{totalOurScore}</p>
          </div>
          <div className="text-slate-500 text-xl">:</div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">{match.awayTeamName}</p>
            <p className="text-4xl font-bold">{totalOppScore}</p>
          </div>
        </div>
      </div>

      {/* Sets */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">各局情况</h2>
        <div className="space-y-2">
          {match.sets.map((set) => (
            <div
              key={set.id}
              className="bg-slate-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">第 {set.setNumber} 局</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm px-2 py-0.5 rounded-full ${
                    set.isCompleted
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-emerald-900 text-emerald-300'
                  }`}>
                    {set.isCompleted ? '已结束' : '进行中'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSet(set.id, e)}
                    className="touch-target p-1.5 text-slate-500 active:text-red-400 rounded-lg"
                    title="删除本局"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 text-2xl font-bold mb-3">
                <span className="text-xs text-slate-400 font-normal whitespace-nowrap">
                  暂停{rallies.filter((r) => r.setId === set.id && r.timeout).length}
                </span>
                <span>{set.ourScore}</span>
                <span className="text-slate-500">-</span>
                <span>{set.opponentScore}</span>
                <span className="text-xs text-slate-400 font-normal whitespace-nowrap">
                  换人{rallies.filter((r) => r.setId === set.id && r.hasSubstitution).length}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleContinueSet(set.id)}
                  className="flex-1 touch-target bg-primary-600 text-white rounded-lg py-2.5
                    active:bg-primary-700 flex items-center justify-center gap-1.5 text-sm font-semibold"
                >
                  <Play className="w-4 h-4" />
                  继续记录
                </button>
                <button
                  onClick={() => navigate(`/match/${match.id}/set/${set.id}`)}
                  className="flex-1 touch-target bg-slate-700 text-slate-200 rounded-lg py-2.5
                    active:bg-slate-600 flex items-center justify-center gap-1.5 text-sm font-semibold"
                >
                  查看回合
                </button>
                <button
                  onClick={() => navigate(`/match/${match.id}/set/${set.id}/stats`)}
                  className="flex-1 touch-target bg-slate-700 text-slate-200 rounded-lg py-2.5
                    active:bg-slate-600 flex items-center justify-center gap-1.5 text-sm font-semibold"
                >
                  <BarChart3 className="w-4 h-4" />
                  统计
                </button>
              </div>
            </div>
          ))}

          {match.sets.length === 0 && (
            <p className="text-center text-slate-500 py-8">还没有记录任何局</p>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 py-4 border-t border-slate-800 space-y-2">
        {canAddSet && !currentSet && (
          <button
            onClick={handleStartSet}
            className="w-full touch-target bg-emerald-600 text-white font-bold text-lg rounded-xl py-4
              active:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            开始第 {match.sets.length + 1} 局
          </button>
        )}
        {currentSet && (
          <button
            onClick={() => handleContinueSet(currentSet.id)}
            className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4
              active:bg-primary-700 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            继续第 {currentSet.setNumber} 局
          </button>
        )}
        {match.sets.some((s) => s.isCompleted) && (
          <button
            onClick={() => navigate(`/match/${match.id}/stats`)}
            className="w-full touch-target bg-slate-700 text-white font-bold text-lg rounded-xl py-4
              active:bg-slate-600 flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            查看全场分析
          </button>
        )}
      </div>
    </div>
  );
}
