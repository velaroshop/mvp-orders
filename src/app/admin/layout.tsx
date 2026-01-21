import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Topbar */}
      <Topbar />

      {/* Main content */}
      <main className="flex-1 lg:ml-48 mt-16">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
