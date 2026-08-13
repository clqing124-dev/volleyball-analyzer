// ============================================================
// NewMatchPage — 新建比赛三步向导
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, X, Upload } from 'lucide-react';
import type { MatchMode, Player } from '@/types';
import { useMatchStore } from '@/stores/match-store';

type Step = 1 | 2 | 3;

const POSITIONS = ['主攻', '副攻', '二传', '接应', '自由人'];

export function NewMatchPage() {
  const navigate = useNavigate();
  const { createMatch } = useMatchStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<MatchMode>('own');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [players, setPlayers] = useState<Omit<Player, 'id' | 'matchId'>[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');

  const addPlayer = () => {
    const num = parseInt(newNumber);
    if (!num || num < 1 || num > 99) return;
    if (players.some((p) => p.jerseyNumber === num)) return;

    setPlayers([...players, {
      jerseyNumber: num,
      name: newName || undefined,
      position: newPosition || undefined,
    }]);
    setNewNumber('');
    setNewName('');
    setNewPosition('');
  };

  const removePlayer = (num: number) => {
    setPlayers(players.filter((p) => p.jerseyNumber !== num));
  };

  // CSV 导入
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const imported: Omit<Player, 'id' | 'matchId'>[] = [];

      for (const line of lines) {
        // 支持格式: 号码,姓名,位置  或  号码,姓名  或  号码
        const parts = line.split(',').map((s) => s.trim());
        const num = parseInt(parts[0]);
        if (!num || num < 1 || num > 99) continue;

        imported.push({
          jerseyNumber: num,
          name: parts[1] || undefined,
          position: parts[2] || undefined,
        });
      }

      if (imported.length > 0) {
        // 合并，去重
        const existing = new Set(players.map((p) => p.jerseyNumber));
        const merged = [
          ...players,
          ...imported.filter((p) => !existing.has(p.jerseyNumber)),
        ];
        setPlayers(merged);
      }
    };
    reader.readAsText(file);
    // 清除 input 以便重新选择同一文件
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!homeTeam.trim() || !awayTeam.trim()) return;

    await createMatch({
      type: mode,
      homeTeamName: homeTeam.trim(),
      awayTeamName: awayTeam.trim(),
      date,
      players,
    });
    navigate('/');
  };

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return homeTeam.trim() && awayTeam.trim();
    return true;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => (step === 1 ? navigate('/') : setStep((step - 1) as Step))} className="touch-target p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2 flex-1">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4">
        {step === 1 && (
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-6">选择分析模式</h2>
            <div className="space-y-3">
              <button
                onClick={() => setMode('own')}
                className={`w-full p-5 rounded-xl text-left transition-all ${
                  mode === 'own'
                    ? 'bg-primary-600 ring-2 ring-primary-300'
                    : 'bg-slate-800'
                }`}
              >
                <div className="text-lg font-bold mb-1">己方分析</div>
                <div className="text-sm text-slate-300">
                  录入我方球员，记录我方队伍在场上的表现，包含串联分析、追发人、拦回保护等完整指标
                </div>
              </button>
              <button
                onClick={() => setMode('opponent')}
                className={`w-full p-5 rounded-xl text-left transition-all ${
                  mode === 'opponent'
                    ? 'bg-primary-600 ring-2 ring-primary-300'
                    : 'bg-slate-800'
                }`}
              >
                <div className="text-lg font-bold mb-1">对手分析</div>
                <div className="text-sm text-slate-300">
                  录入对手球员，观察对手和其他队伍比赛时的表现，专注于发球、一传、进攻、拦防等核心指标
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="pt-4 space-y-5">
            <h2 className="text-xl font-bold mb-2">比赛信息</h2>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                {mode === 'own' ? '我方队名' : '分析对象（对手）队名'}
              </label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder={mode === 'own' ? '输入我方队名' : '输入要分析的对手队名'}
                className="w-full bg-slate-800 rounded-lg px-4 py-3 text-white text-base
                  placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                {mode === 'own' ? '对方队名' : '对手的比赛对手'}
              </label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder={mode === 'own' ? '输入对方队名' : '输入对手正在比赛的队伍名'}
                className="w-full bg-slate-800 rounded-lg px-4 py-3 text-white text-base
                  placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">比赛日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 rounded-lg px-4 py-3 text-white text-base
                  outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="pt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">球员录入</h2>
                <p className="text-sm text-slate-400">
                  {mode === 'own'
                    ? '输入本场比赛我方上场球员'
                    : '输入要分析的对手球员'}
                </p>
              </div>
              {/* CSV 导入按钮 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="touch-target flex items-center gap-1.5 bg-slate-700 text-slate-200
                  rounded-lg px-3 py-2 text-sm active:bg-slate-600"
              >
                <Upload className="w-4 h-4" />
                CSV导入
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>

            <p className="text-xs text-slate-500">
              CSV格式: 号码,姓名,位置（每行一个球员），例如 "8,张三,主攻"
            </p>

            {/* 添加球员 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="号码"
                  min={1}
                  max={99}
                  className="w-16 bg-slate-800 rounded-lg px-3 py-3 text-white text-base
                    placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="姓名(选填)"
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-3 text-white text-base
                    placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="w-20 bg-slate-800 rounded-lg px-2 py-3 text-white text-sm
                    outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">位置</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={addPlayer}
                  className="touch-target bg-primary-600 rounded-lg px-3 active:bg-primary-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 球员列表 */}
            <div className="space-y-2">
              {players.length === 0 && (
                <p className="text-center text-slate-500 py-6">暂无球员，请添加或导入CSV文件</p>
              )}
              {players
                .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
                .map((p) => (
                  <div
                    key={p.jerseyNumber}
                    className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-primary-900 text-primary-300 w-10 h-10 rounded-full
                        flex items-center justify-center font-bold text-lg">
                        {p.jerseyNumber}
                      </span>
                      <div>
                        <span className="text-slate-200">
                          {p.name || `球员 ${p.jerseyNumber}`}
                        </span>
                        {p.position && (
                          <span className="text-xs text-slate-400 ml-2">{p.position}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removePlayer(p.jerseyNumber)}
                      className="touch-target p-1 text-slate-400 active:text-red-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        {step < 3 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canNext()}
            className="w-full touch-target bg-primary-600 text-white font-bold text-lg rounded-xl py-4
              active:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            下一步
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!homeTeam.trim() || !awayTeam.trim()}
            className="w-full touch-target bg-emerald-600 text-white font-bold text-lg rounded-xl py-4
              active:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            创建比赛
          </button>
        )}
      </div>
    </div>
  );
}
