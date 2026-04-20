import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-space-950 text-slate-100 antialiased">
      <Sidebar />
      {/* Content area — offset for fixed 256 px sidebar */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
