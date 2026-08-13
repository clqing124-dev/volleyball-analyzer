// ============================================================
// NumberPad — 球衣号码选择器 (大网格)
// ============================================================

import { cn } from '@/utils/cn';

interface NumberPadProps {
  numbers: number[];
  selected: number | null;
  onSelect: (n: number) => void;
  allowSkip?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function NumberPad({
  numbers,
  selected,
  onSelect,
  allowSkip,
  onSkip,
  skipLabel = '跳过',
}: NumberPadProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
          const exists = numbers.includes(n);
          const isSelected = selected === n;

          return (
            <button
              key={n}
              onClick={() => exists && onSelect(n)}
              disabled={!exists}
              className={cn(
                'touch-target rounded-lg text-lg font-bold transition-all',
                'min-h-12',
                isSelected && 'bg-primary-600 text-white scale-95',
                exists && !isSelected && 'bg-slate-700 text-slate-200 active:bg-slate-600',
                !exists && 'bg-slate-800 text-slate-600 cursor-not-allowed',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      {allowSkip && onSkip && (
        <button
          onClick={onSkip}
          className="w-full touch-target text-slate-400 text-sm py-2 active:text-slate-300"
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
