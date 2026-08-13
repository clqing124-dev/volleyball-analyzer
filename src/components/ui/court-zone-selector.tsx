// ============================================================
// CourtZoneSelector — 排球场地区域选择器 (3x2 网格)
// ============================================================

import { cn } from '@/utils/cn';
import type { CourtZone } from '@/types/actions';
import { COURT_ZONE_LABELS } from '@/types/actions';

interface CourtZoneSelectorProps {
  selected: CourtZone | null;
  onSelect: (zone: CourtZone) => void;
}

// 球场布局: 网在中间，上方(1,6,5)，下方(2,3,4)
// 从上方俯视:  1  6  5
//              2  3  4
// 简化: 显示为 2x3 网格

const ZONE_LAYOUT: { zone: CourtZone; label: string; row: 1 | 2; col: 1 | 2 | 3 }[] = [
  { zone: 4, label: '4', row: 1, col: 1 },
  { zone: 3, label: '3', row: 1, col: 2 },
  { zone: 2, label: '2', row: 1, col: 3 },
  { zone: 5, label: '5', row: 2, col: 1 },
  { zone: 6, label: '6', row: 2, col: 2 },
  { zone: 1, label: '1', row: 2, col: 3 },
];

export function CourtZoneSelector({
  selected,
  onSelect,
}: CourtZoneSelectorProps) {
  return (
    <div className="relative">
      {/* 球网线 */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-500 z-10 transform -translate-y-1/2" />
      <div className="absolute top-1/2 left-0 right-0 text-center transform -translate-y-1/2 z-20">
        <span className="bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full">网</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-4 pb-4">
        {ZONE_LAYOUT.map(({ zone, label, row }) => {
          const isSelected = selected === zone;
          return (
            <button
              key={zone}
              onClick={() => onSelect(zone)}
              className={cn(
                'touch-target rounded-xl text-xl font-bold transition-all py-6',
                'min-h-16',
                isSelected
                  ? 'bg-primary-600 text-white scale-95 ring-2 ring-primary-300'
                  : 'bg-slate-800 text-slate-300 active:bg-slate-700',
                row === 1 && 'border-t-2 border-slate-500',
                row === 2 && 'border-b-2 border-slate-500',
              )}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl">{label}</span>
                <span className="text-xs text-slate-400 mt-0.5">
                  {COURT_ZONE_LABELS[zone]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
