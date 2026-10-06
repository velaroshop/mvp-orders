interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Header consistent pentru toate paginile admin.
 * Titlu + descriere opțională + acțiuni (butoane) în dreapta.
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: "light" | "dark";
}

export default function PageHeader({ title, description, actions, variant = "dark" }: PageHeaderProps) {
  const titleCls = variant === "dark" ? "page-title" : "text-xl font-semibold text-slate-900";
  const descCls  = variant === "dark" ? "page-subtitle" : "text-sm text-slate-500 mt-0.5";
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className={titleCls}>{title}</h1>
        {description && <p className={descCls}>{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
