// Organization system type definitions

// ===== Database Types (snake_case for Supabase) =====

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  plan_type: string;
  plan_status: string;
  max_members: number;
  max_storage_mb: number;
  settings: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface OrganizationRole {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  permissions: PermissionConfig;
  is_system: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  status: "active" | "invited" | "suspended" | "removed";
  joined_at: string | null;
  invited_by: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  token: string;
  invited_by: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// ===== Permission Types =====

export interface ModulePermission {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
}

export interface AdminPermission {
  manage_members: boolean;
  manage_roles: boolean;
  manage_settings: boolean;
  view_analytics: boolean;
  manage_billing: boolean;
}

export interface DataPermission {
  can_export: boolean;
  can_import: boolean;
  can_share: boolean;
}

export interface PermissionConfig {
  modules: Record<string, ModulePermission>;
  admin: AdminPermission;
  data: DataPermission;
}

// ===== Frontend Types (camelCase for React) =====

export interface OrgContext {
  organization: Organization | null;
  currentOrgId: string | null;
  membership: OrganizationMember | null;
  role: OrganizationRole | null;
  permissions: PermissionConfig | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

export interface MemberWithProfile extends OrganizationMember {
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      display_name?: string;
      avatar_url?: string;
    };
  };
  role?: OrganizationRole;
}

export interface InvitationWithRole extends OrganizationInvitation {
  role?: OrganizationRole;
}

// ===== System Role Names =====

export const SYSTEM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

// ===== Module Names =====

export type ModuleName =
  | "dashboard"
  | "vehicle_check"
  | "documents"
  | "compliance"
  | "proforma_invoice"
  | "customers"
  | "shipping"
  | "policies"
  | "tracking"
  | "bookmarks"
  | "my_records";

// ===== Module Definitions =====

export const MODULE_DEFINITIONS: Record<ModuleName, { label: string; description: string }> = {
  dashboard: { label: "工作台", description: "查看总览仪表盘" },
  vehicle_check: { label: "车辆核验", description: "VIN码查询与车辆信息核验" },
  documents: { label: "单证模板", description: "报关单、商业发票等单证生成" },
  compliance: { label: "准入声明", description: "符合目标市场准入声明文件" },
  proforma_invoice: { label: "形式发票", description: "形式发票制作与管理" },
  customers: { label: "客户管理", description: "海外买家信息管理" },
  shipping: { label: "运费测算", description: "国际物流费用计算" },
  policies: { label: "准入政策", description: "各国二手车进口政策查询" },
  tracking: { label: "海运跟踪", description: "海运位置实时跟踪" },
  bookmarks: { label: "收藏夹", description: "收藏常用网址和资料" },
  my_records: { label: "我的记录", description: "查看已保存的声明与发票" },
};
