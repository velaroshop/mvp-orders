type BadgeColor = "yellow" | "green" | "red" | "orange" | "blue" | "purple" | "zinc";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

export default function Badge({ children, color = "zinc", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${color} ${className}`}>
      {children}
    </span>
  );
}

/** Mapare status comandă → culoare badge */
export function orderStatusColor(status: string): BadgeColor {
  switch (status) {
    case "confirmed":  return "green";
    case "pending":    return "yellow";
    case "queue":      return "purple";
    case "hold":       return "orange";
    case "cancelled":  return "red";
    case "scheduled":  return "blue";
    case "testing":    return "blue";
    case "sync_error": return "red";
    default:           return "zinc";
  }
}
