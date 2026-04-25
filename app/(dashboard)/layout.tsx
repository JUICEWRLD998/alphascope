import DashboardShell from '@/components/layout/DashboardShell';
import { CompareProvider } from '@/lib/compare';
import CompareTray from '@/components/ui/CompareTray';
import CompareModal from '@/components/ui/CompareModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompareProvider>
      <div className="flex min-h-screen bg-space-950 text-slate-100 antialiased">
        <DashboardShell>{children}</DashboardShell>
      </div>
      <CompareTray />
      <CompareModal />
    </CompareProvider>
  );
}
