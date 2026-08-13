// ============================================================
// ChipGroup — 横向可换行的选项按钮组
// ============================================================

import { cn } from '@/utils/cn';

interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: string;
  prominent?: boolean;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  columns?: 2 | 3 | 4;
}

export function ChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  columns = 2,
}: ChipGroupProps<T>) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'touch-target rounded-lg text-base font-medium transition-all py-3 px-2',
              'min-h-touch',
              opt.prominent && isSelected && 'ring-2 ring-white',
              isSelected
                ? 'bg-primary-600 text-white scale-95'
                : 'bg-slate-800 text-slate-300 active:bg-slate-700',
            )}
            style={opt.color && isSelected ? { backgroundColor: opt.color } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
