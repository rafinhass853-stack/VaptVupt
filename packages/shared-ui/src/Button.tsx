import type { ReactNode, ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-[#e30613] hover:bg-[#c80511] text-white shadow-sm disabled:bg-[#f38a90]",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-50",
    success:
      "bg-[#168b45] hover:bg-[#11743a] text-white shadow-sm disabled:bg-[#7bc59b]",
    danger:
      "bg-[#c1121f] hover:bg-[#a50f1a] text-white shadow-sm disabled:bg-[#ef8a91]",
    ghost: "bg-transparent hover:bg-[#fff4cc] text-slate-700",
    outline:
      "bg-white border border-slate-300 hover:bg-[#fff8df] text-slate-700",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl transition
        disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}