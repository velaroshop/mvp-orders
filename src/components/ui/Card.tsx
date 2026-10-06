interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  variant?: "light" | "dark";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/**
 * Container card cu border și shadow.
 * variant="light" (default) — fundal alb, pentru pagini light
 * variant="dark"            — fundal zinc-800, pentru pagini dark
 */
export default function Card({ children, className = "", padding = "md", variant = "light" }: CardProps) {
  const base = variant === "dark"
    ? "card"
    : "bg-white rounded-xl border border-slate-200 shadow-sm";
  return (
    <div className={`${base} ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, description, actions }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
