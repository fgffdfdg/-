"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Shield, Settings } from "lucide-react";
import { useOrg, useAdminPermission } from "@/lib/org";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/organization", label: "企业信息", icon: Building2, adminOnly: false },
  { href: "/settings/members", label: "成员管理", icon: Users, adminOnly: true },
  { href: "/settings/roles", label: "角色权限", icon: Shield, adminOnly: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organization, isLoading } = useOrg();
  const { canManageMembers, canManageRoles } = useAdminPermission();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">尚未加入任何组织</h2>
        <p className="text-sm text-muted-foreground">请先创建一个组织或接受邀请加入</p>
        <Link
          href="/create-org"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          创建组织
        </Link>
      </div>
    );
  }

  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && tab.href.includes("members")) return canManageMembers;
    if (tab.adminOnly && tab.href.includes("roles")) return canManageRoles;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">组织设置</h1>
        <p className="text-sm text-muted-foreground mt-1">{organization.name}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
