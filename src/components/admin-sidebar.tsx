'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Megaphone,
  Users,
  Settings,
  LogOut,
  Globe,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { AdminSessionPayload } from '@/lib/admin/auth';

const adminNavItems = [
  {
    title: '数据概览',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: '内容运营',
    href: '/admin/content',
    icon: FileText,
    children: [
      { title: '单证模板', href: '/admin/content/templates' },
      { title: '准入政策', href: '/admin/content/policies' },
      { title: '合规文件', href: '/admin/content/compliance' },
      { title: '文章管理', href: '/admin/content/articles' },
    ],
  },
  {
    title: '数据运营',
    href: '/admin/analytics',
    icon: BarChart3,
    children: [
      { title: '用户统计', href: '/admin/analytics/users' },
      { title: '使用分析', href: '/admin/analytics/usage' },
      { title: '业务报表', href: '/admin/analytics/reports' },
    ],
  },
  {
    title: '活动运营',
    href: '/admin/campaigns',
    icon: Megaphone,
    children: [
      { title: '活动管理', href: '/admin/campaigns/list' },
      { title: '参与跟踪', href: '/admin/campaigns/tracking' },
    ],
  },
  {
    title: '用户管理',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: '系统设置',
    href: '/admin/settings',
    icon: Settings,
  },
];

interface AdminSidebarProps {
  admin: AdminSessionPayload;
}

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Auto-expand sections that contain the current path
    const initial: Record<string, boolean> = {};
    adminNavItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        initial[item.href] = true;
      }
    });
    return initial;
  });

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleSignOut = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const roleLabels: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-base text-white">汽车出口通</span>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-accent" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Admin Portal</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href;
          const isSectionActive = item.children && pathname.startsWith(item.href + '/');
          const isExpanded = expandedSections[item.href] || isSectionActive;

          return (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleSection(item.href)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors',
                      isSectionActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-white/30" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-white/30" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block px-3 py-1.5 rounded-md text-xs transition-colors',
                            pathname === child.href
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white'
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {admin.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{admin.name || admin.email}</p>
            <p className="text-[10px] text-white/40">{roleLabels[admin.role] || admin.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 px-3 py-1.5 text-xs text-center bg-white/5 hover:bg-white/10 rounded-md transition-colors text-sidebar-foreground"
          >
            用户端
          </Link>
          <button
            onClick={handleSignOut}
            className="flex-1 px-3 py-1.5 text-xs text-center bg-destructive/15 hover:bg-destructive/25 text-destructive rounded-md transition-colors flex items-center justify-center gap-1"
          >
            <LogOut className="h-3 w-3" />
            退出
          </button>
        </div>
      </div>
    </aside>
  );
}
