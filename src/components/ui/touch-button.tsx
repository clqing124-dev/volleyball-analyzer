// ============================================================
// TouchButton — 触摸友好的大按钮
// ============================================================

import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  label: string;
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary-600 text-white active:bg-primary-700',
  secondary: 'bg-slate-700 text-slate-200 active:bg-slate-600',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'bg-transparent text-slate-400 active:bg-slate-800',
  success: 'bg-emerald-600 text-white active:bg-emerald-700',
};

const sizeStyles: Record<string, string> = {
  lg: 'min-h-14 text-lg rounded-xl px-6 py-3',
  md: 'min-h-touch text-base rounded-lg px-4 py-2.5',
  sm: 'min-h-10 text-sm rounded-lg px-3 py-1.5',
};

export function TouchButton({
  variant = 'primary',
  size = 'lg',
  icon,
  label,
  loading,
  className,
  disabled,
  ...props
}: TouchButtonProps) {
  return (
    <button
      className={cn(
        'touch-target font-semibold transition-all duration-150 select-none',
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50 pointer-events-none',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? '...' : label}
    </button>
  );
}
