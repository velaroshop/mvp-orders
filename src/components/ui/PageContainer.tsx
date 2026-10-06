interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper consistent pentru toate paginile admin.
 * Setează max-width și padding uniform.
 */
export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>
      {children}
    </div>
  );
}
