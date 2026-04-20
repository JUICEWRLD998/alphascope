import DashboardShell from '@/components/layout/DashboardShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-space-950 text-slate-100 antialiased">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
