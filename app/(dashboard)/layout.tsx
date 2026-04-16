import Sidebar from '@/components/layout/sidebar';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8f9fb' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-hidden">
        {children}
      </div>
    </div>
  );
}
