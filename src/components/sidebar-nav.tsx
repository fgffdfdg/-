'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Anchor,
  LogOut,
  LogIn,
  UserCircle,
  User,
  Loader2,
  Car,
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  Building2,
  Ship,
  Calculator,
  Stamp,
  Receipt,
  Landmark,
  FileSignature,
  FileCheck,
  ExternalLink,
  Archive,
  ArrowRightLeft,
  Cloud,
  LayoutDashboard,
  Package,
  Shield,
  Truck,
  Users,
  FileSearch,
  } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';

// 动态导入 OrgSwitcher，仅在登录后才加载
const OrgSwitcher = dynamic(() => import('./org-switcher').then(mod => ({ default: mod.OrgSwitcher })), {
  loading: () => <div className="h-9 rounded-lg bg-white/[0.06] animate-pulse" />,
});

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  desc: string;
  cloud?: boolean;
}

interface NavSubGroup {
  title: string;
  items: NavItem[];
}

interface NavGroup {
  title: string;
  /** 如果是子分组模式，使用 subGroups */
  subGroups?: NavSubGroup[];
  /** 简单模式，直接 items */
  items?: NavItem[];
  /** 默认折叠（出口工具默认折叠，其他默认展开） */
  defaultCollapsed?: boolean;
}

const navGroups: NavGroup[] = [
  {
    title: '项目工作台',
    items: [
      { href: '/', label: '工作台首页', icon: LayoutDashboard, desc: '今日待办、异常与活跃项目' },
    ],
  },
  {
    title: '出口工具',
    defaultCollapsed: false,
    subGroups: [
      {
        title: '找车与验车',
        items: [
          { href: '/vehicle-sourcing', label: '选车工作台', icon: Search, desc: '候选车辆评估与管理', cloud: true },
          { href: '/vehicle-query', label: '车况查询', icon: FileSearch, desc: 'VIN车况报告查询', cloud: true },
          { href: '/car-inventory', label: '车辆档案', icon: Archive, desc: '车辆档案与车况检测', cloud: true },
          { href: '/vin-lookup', label: '配置查询', icon: Car, desc: 'VIN查询与参数报告' },
        ],
      },
      {
        title: '报价与成交',
        items: [
          { href: '/quote-calculator', label: '报价计算器', icon: Calculator, desc: '设计公式与报价计算', cloud: true },
          { href: '/proforma-invoice', label: '形式发票', icon: FileText, desc: '形式发票制作与导出', cloud: true },
        ],
      },
      {
        title: '采购与转移',
        items: [
          { href: '/procurement', label: '车辆采购', icon: Package, desc: '采购合同与附件管理', cloud: true },
          { href: '/vehicle-office', label: '出口待转移', icon: ArrowRightLeft, desc: '转移进度与附件归档', cloud: true },
        ],
      },
      {
        title: '单证与许可',
        items: [
          { href: '/documents', label: '发票合同装箱单', icon: FolderOpen, desc: '一次填写，生成合同/发票/装箱单', cloud: true },
          { href: '/export-license/draft', label: '许可证草单', icon: FileSignature, desc: '主证 + 附加信息表', cloud: true },
          { href: '/export-license', label: '出口许可证', icon: FileCheck, desc: '商务部入口与已签发归档', cloud: true },
          { href: '/compliance-declaration', label: '准入声明', icon: Shield, desc: '符合目标市场准入声明', cloud: true },
          { href: '/stamp', label: '印章工具', icon: Stamp, desc: '制作印章与文件盖章' },
          { href: '/document-search', label: '单证检索', icon: Search, desc: '按编号检索全部单证', cloud: true },
          { href: '/customs-declaration/upload', label: '报关单上传', icon: FileCheck, desc: '上传正式报关单扫描件', cloud: true },
        ],
      },
      {
        title: '报关与税务',
        items: [
          { href: '/customs-declaration', label: '报关预录', icon: Anchor, desc: '出口报关单预录与单一窗口', cloud: true },
          { href: '/invoice-tax', label: '发票报税', icon: Receipt, desc: '发票与报税工作台', cloud: true },
          { href: '/tax-bureaus', label: '税务局导航', icon: Landmark, desc: '收藏税务局官网入口', cloud: true },
          { href: '/invoice-titles', label: '发票抬头', icon: FileText, desc: '本公司与合作方抬头', cloud: true },
        ],
      },
      {
        title: '运输与归档',
        items: [
          { href: '/tracking', label: '运输跟踪', icon: Ship, desc: '订舱至交付全流程跟踪', cloud: true },
          { href: '/shipping/bl-documents', label: '海运提单', icon: FileText, desc: '提单上传与车架号绑定', cloud: true },
        ],
      },
    ],
  },
  {
    title: '客户与记录',
    items: [
      { href: '/customers', label: '客户管理', icon: Users, desc: '管理海外买家信息', cloud: true },
      { href: '/my-records', label: '我的记录', icon: FileText, desc: '已保存的声明与发票', cloud: true },
    ],
  },
  {
    title: '个人与组织',
    items: [
      { href: '/user-center', label: '用户中心', icon: UserCircle, desc: '公司信息与收款账户', cloud: true },
      { href: '/settings/organization', label: '组织设置', icon: Building2, desc: '团队管理与权限', cloud: true },
    ],
  },
];

interface SidebarNavProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function SidebarNav({ mobile = false, onClose }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const isLoggedIn = !!user;
  const userName = user?.user_metadata?.full_name || user?.email || '';
  const userEmail = user?.email || '';

  // 初始化折叠状态
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      if (group.defaultCollapsed) {
        initial[group.title] = true;
      }
    });
    setCollapsedGroups(initial);
  }, []);

  // 预取所有导航路由
  useEffect(() => {
    navGroups.forEach((group) => {
      if (group.items) {
        group.items.forEach((item) => router.prefetch(item.href));
      }
      if (group.subGroups) {
        group.subGroups.forEach((sg) => {
          sg.items.forEach((item) => router.prefetch(item.href));
        });
      }
    });
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  const navItemClass = mobile
    ? "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-all duration-150 active:scale-[0.98]"
    : "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150";

  const iconClass = mobile ? "h-5 w-5 shrink-0 transition-colors" : "h-[18px] w-[18px] shrink-0 transition-colors";

  // 渲染单个导航项
  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavClick}
        className={`${navItemClass} ${
          active
            ? 'bg-white/[0.12] text-white'
            : 'text-white/75 hover:bg-white/[0.08] hover:text-white'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-orange" />
        )}
        <Icon className={`${iconClass} ${active ? 'text-orange' : 'text-white/55 group-hover:text-white/80'}`} />
        <span className="truncate">{item.label}</span>
        {item.cloud && (
          <Cloud className="ml-auto h-3 w-3 shrink-0 text-white/25" aria-label="云端保存" />
        )}
      </Link>
    );
  };

  return (
    <>
      <aside className={`fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col bg-navy text-sidebar-foreground ${mobile ? 'shadow-2xl' : ''}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 border-b border-white/[0.06] px-4 ${mobile ? 'h-14' : 'h-14'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange shadow-sm shadow-orange/20">
            <Anchor className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[13px] font-semibold tracking-wide text-white leading-tight">汽车出口通</h1>
            <p className="text-[10px] text-white/50 leading-tight">专业工具 · 高效出口</p>
          </div>
          {mobile && onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Organization Switcher */}
        {isLoggedIn && (
          <div className="px-2.5 pt-2 pb-1 border-b border-white/[0.06]">
            <OrgSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-thin">
          {/* 导航分组 */}
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.title];
            const hasSubGroups = !!group.subGroups;
            const flatItems = group.items || [];
            const hasAnyActive = hasSubGroups
              ? group.subGroups!.some(sg => sg.items.some(item => isActive(item.href)))
              : flatItems.some(item => isActive(item.href));

            return (
              <div key={group.title} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className={`flex w-full items-center gap-1 transition-colors ${mobile ? 'px-3 py-2.5 text-[11px]' : 'px-2 py-1.5 text-[10.5px]'} font-semibold uppercase tracking-wider ${hasAnyActive ? 'text-orange' : 'text-white/50 hover:text-white/70'}`}
                >
                  <span className="flex-1 text-left">{group.title}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                  {hasSubGroups ? (
                    // 子分组模式
                    group.subGroups!.map((subGroup) => (
                      <div key={subGroup.title} className="mb-1">
                        <div className="px-2 py-0.5 text-[10px] font-medium text-white/35 uppercase tracking-wider">
                          {subGroup.title}
                        </div>
                        <div className="space-y-0.5">
                          {subGroup.items.map(renderNavItem)}
                        </div>
                      </div>
                    ))
                  ) : (
                    // 简单模式
                    <div className="space-y-0.5">
                      {flatItems.map(renderNavItem)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer - User Info */}
        <div className={`border-t border-white/[0.06] px-3 ${mobile ? 'py-4' : 'py-3'}`}>
          {isLoggedIn ? (
            <div className="space-y-2.5">
              <div className={`flex items-center gap-2.5 px-1 ${mobile ? 'py-1' : ''}`}>
                <div className={`flex items-center justify-center rounded-full bg-orange/15 ring-1 ring-orange/20 ${mobile ? 'h-9 w-9' : 'h-7 w-7'}`}>
                  <User className={`${mobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} text-orange`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-white/90 truncate ${mobile ? 'text-[13px]' : 'text-[12px]'}`}>{userName}</p>
                  {userEmail && <p className="text-[10px] text-white/45 truncate">{userEmail}</p>}
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full flex items-center justify-center gap-1.5 rounded-lg text-white/55 hover:text-white/85 hover:bg-white/[0.08] transition-colors ${mobile ? 'px-3 py-2.5 text-[13px]' : 'px-3 py-1.5 text-[11px]'}`}
              >
                <LogOut className={`${mobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                退出登录
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={handleNavClick}
              className={`flex items-center justify-center gap-1.5 rounded-lg text-white bg-orange hover:bg-orange/90 transition-colors font-medium shadow-sm shadow-orange/20 ${mobile ? 'px-3 py-2.5 text-[13px]' : 'px-3 py-2 text-[12px]'}`}
            >
              <LogIn className={`${mobile ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
              登录账号
            </Link>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-border">
            <h3 className="text-base font-semibold text-foreground mb-1.5">确认退出登录？</h3>
            <p className="text-sm text-muted-foreground mb-5">退出后需要重新登录才能使用平台功能。</p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className={`flex-1 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors ${mobile ? 'py-3' : 'py-2'}`}
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className={`flex-1 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${mobile ? 'py-3' : 'py-2'}`}
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    退出中...
                  </>
                ) : (
                  '确认退出'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}