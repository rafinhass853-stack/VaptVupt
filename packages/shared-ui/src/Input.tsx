import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  className = "",
  ...rest
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full rounded-lg border transition
            ${error ? "border-red-400 focus:ring-red-500" : "border-slate-300 focus:ring-emerald-500"}
            focus:ring-2 focus:border-transparent
            ${icon ? "pl-10" : "pl-4"} pr-4 py-2.5 text-sm
            disabled:bg-slate-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}