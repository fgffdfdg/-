import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminThemeToggle } from './admin-theme-toggle';

export const metadata = {
  title: '汽车出口通 - 管理后台',
  description: '汽车出口通管理后台',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar admin={session} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-end h-14 px-6 border-b border-border bg-card">
          <AdminThemeToggle />
        </div>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
