// ============================================================
// SetDetailPage — 局详情：列出所有回合（分数x:分数y）
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMatchStore } from '@/stores/match-store';
import { db } from '@/db/volleyball-db';
import type { Rally } from '@/types';

export function SetDetailPage() {
  const { matchId, setId } = useParams<{ matchId: string; setId: string }>();
  const navigate = useNavigate();
  const { getMatch } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId || !setId) return;
    getMatch(matchId).then((m) => setMatch(m));
    db.rallies.where('setId').equals(setId).toArray().then((r) => {
      setRallies(r.sort((a, b) => a.rallyNumber - b.rallyNumber));
      setLoading(false);
    });
  }, [matchId, setId]);

  if (loading || !match) {
    return <div className="flex items-center justify-center h-full text-slate-400">加载中...</div>;
  }

  const setInfo = match.sets?.find((s: any) => s.id === setId);

  const actionCount = (r: Rally) => r.actions.length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/match/${matchId}`)} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">第 {setInfo?.setNumber} 局 · 回合列表</h1>
          <p className="text-sm text-slate-400">{setInfo?.ourScore} - {setInfo?.opponentScore} · 共 {rallies.length} 回合</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {rallies.length === 0 ? (
          <p className="text-center text-slate-500 py-10">本局还没有记录回合</p>
        ) : (
          <div className="space-y-2">
            {rallies.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate(`/match/${matchId}/set/${setId}/rally/${r.id}`)}
                className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between active:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-slate-700 rounded-lg px-2 py-1 text-sm text-slate-300">第{r.rallyNumber}分</span>
                  <span className={`text-sm ${r.side === 'serving' ? 'text-primary-300' : 'text-slate-400'}`}>
                    {r.side === 'serving' ? '🏐 发球' : '🛡️ 接发'}
                  </span>
                  <span className="text-xs text-slate-500">{actionCount(r)} 环节</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${r.outcome === 'our_score' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.homeScoreAfter} : {r.awayScoreAfter}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
