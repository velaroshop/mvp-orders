import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantMap = {
  primary:   "bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent shadow-sm",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm",
  danger:    "bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm",
  ghost:     "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent",
};

const sizeMap = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-sm rounded-xl",
};

/**
 * Buton consistent pentru toate paginile admin.
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
