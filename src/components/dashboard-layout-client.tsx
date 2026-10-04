'use client';

import SidebarNav from '@/components/sidebar-nav';
import { AuthGuard } from '@/components/auth-guard';
import { ThemeToggle } from '@/components/theme-toggle';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNav />
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-4 safe-top">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy">
              <span className="text-[11px] font-bold text-white">ED</span>
            </div>
            <span className="text-[15px] font-semibold text-foreground tracking-tight">汽车出口通</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex items-center justify-center w-10 h-10 -mr-2 rounded-xl text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Desktop Top Bar - Theme Toggle */}
        <div className="hidden lg:flex fixed top-0 right-0 z-30 items-center justify-end h-14 px-6">
          <ThemeToggle />
        </div>

        {/* Mobile Sidebar Overlay - Bottom Sheet Style */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-[60]">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileOpen(false)}
            />
            {/* Sidebar Panel - slides from left on mobile */}
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-200 ease-out">
              <SidebarNav mobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="lg:ml-[240px] min-h-screen pt-14 lg:pt-0">
          <div className="p-4 pb-8 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}