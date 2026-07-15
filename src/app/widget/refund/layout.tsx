export default function RefundWidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#ffffff", color: "#111827" }}>
        {children}
      </body>
    </html>
  );
}
