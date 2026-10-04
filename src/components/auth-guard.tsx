"use client";

import { useAuth } from "@/lib/auth-context";

// 骨架屏替代全屏 spinner，让用户立即看到页面结构
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar Skeleton */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-[240px] border-r border-border bg-card">
        <div className="p-4 space-y-4">
          {/* Logo area */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
          {/* Nav items */}
          <div className="space-y-1 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div
                  className="h-3.5 rounded bg-muted animate-pulse"
                  style={{ width: `${[70, 55, 80, 60, 75, 50, 65, 45][i]}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Header Skeleton */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
      </div>

      {/* Main Content Skeleton */}
      <div className="lg:ml-[240px] pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {/* Page title */}
          <div className="h-7 w-40 rounded bg-muted animate-pulse mb-6" />
          {/* Content cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  // 仅在首次加载时显示骨架屏（AuthProvider 在 root layout 中，
  // layout 在客户端导航时不会重新挂载，所以骨架屏只出现一次）
  if (loading) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
}
