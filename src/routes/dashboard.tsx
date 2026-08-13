// ============================================================
// DashboardPage — 首页：比赛列表 + 新建入口
// ============================================================

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Volleyball, Trash2, BarChart3 } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import type { Match } from '@/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const { matches, loading, loadMatches, deleteMatch } = useMatchStore();

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const modeLabel = (type: Match['type']) =>
    type === 'own' ? '己方分析' : '对手分析';

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定删除这场比赛吗？此操作不可恢复。')) {
      await deleteMatch(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Volleyball className="w-7 h-7 text-primary-400" />
            排球记录分析
          </h1>
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {loading ? (
          <div className="text-center text-slate-400 mt-20">加载中...</div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
            <Volleyball className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg mb-2">还没有比赛记录</p>
            <p className="text-sm">点击下方按钮创建第一场比赛</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                onClick={() => navigate(`/match/${match.id}`)}
                className="bg-slate-800 rounded-xl p-4 active:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-primary-900 text-primary-300">
                        {modeLabel(match.type)}
                      </span>
                      {match.syncStatus === 'modified' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300">
                          未同步
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold truncate">
                      {match.homeTeamName} vs {match.awayTeamName}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{match.date}</p>
                    {match.sets.length > 0 && (
                      <p className="text-sm text-slate-300 mt-2">
                        {match.sets.length} 局 |{' '}
                        {match.sets.filter((s) => s.isCompleted).length} 局已完成
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/match/${match.id}/stats`);
                      }}
                      className="touch-target rounded-lg p-2 text-slate-400 active:text-primary-400"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(match.id, e)}
                      className="touch-target rounded-lg p-2 text-slate-400 active:text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 left-6 max-w-lg mx-auto">
        <button
          onClick={() => navigate('/match/new')}
          className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-2xl py-4
            active:bg-primary-700 shadow-lg shadow-primary-900/50 flex items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6" />
          新建比赛
        </button>
      </div>
    </div>
  );
}
