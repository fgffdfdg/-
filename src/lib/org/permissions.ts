import type { PermissionConfig, ModulePermission, SystemRoleName } from "./types";
import { MODULE_DEFINITIONS } from "./types";

export { MODULE_DEFINITIONS };

// ===== Default Permission Templates =====

export function createOwnerPermissions(): PermissionConfig {
  return {
    modules: {
      dashboard: { view: true },
      vehicle_check: { view: true },
      documents: { view: true, create: true, edit: true, delete: true, export: true },
      compliance: { view: true, create: true, edit: true, delete: true, export: true },
      proforma_invoice: { view: true, create: true, edit: true, delete: true, export: true },
      customers: { view: true, create: true, edit: true, delete: true, export: true },
      shipping: { view: true },
      policies: { view: true },
      tracking: { view: true },
      bookmarks: { view: true, create: true, edit: true, delete: true },
      my_records: { view: true },
    },
    admin: {
      manage_members: true,
      manage_roles: true,
      manage_settings: true,
      view_analytics: true,
      manage_billing: true,
    },
    data: { can_export: true, can_import: true, can_share: true },
  };
}

export function createAdminPermissions(): PermissionConfig {
  return {
    modules: {
      dashboard: { view: true },
      vehicle_check: { view: true },
      documents: { view: true, create: true, edit: true, delete: true, export: true },
      compliance: { view: true, create: true, edit: true, delete: true, export: true },
      proforma_invoice: { view: true, create: true, edit: true, delete: true, export: true },
      customers: { view: true, create: true, edit: true, delete: true, export: true },
      shipping: { view: true },
      policies: { view: true },
      tracking: { view: true },
      bookmarks: { view: true, create: true, edit: true, delete: true },
      my_records: { view: true },
    },
    admin: {
      manage_members: true,
      manage_roles: true,
      manage_settings: true,
      view_analytics: true,
      manage_billing: false,
    },
    data: { can_export: true, can_import: true, can_share: true },
  };
}

export function createOperatorPermissions(): PermissionConfig {
  return {
    modules: {
      dashboard: { view: true },
      vehicle_check: { view: true },
      documents: { view: true, create: true, edit: true, delete: false, export: true },
      compliance: { view: true, create: true, edit: true, delete: false, export: true },
      proforma_invoice: { view: true, create: true, edit: true, delete: false, export: true },
      customers: { view: true, create: true, edit: true, delete: false, export: true },
      shipping: { view: true },
      policies: { view: true },
      tracking: { view: true },
      bookmarks: { view: true, create: true, edit: true, delete: true },
      my_records: { view: true },
    },
    admin: {
      manage_members: false,
      manage_roles: false,
      manage_settings: false,
      view_analytics: false,
      manage_billing: false,
    },
    data: { can_export: true, can_import: false, can_share: false },
  };
}

export function createViewerPermissions(): PermissionConfig {
  return {
    modules: {
      dashboard: { view: true },
      vehicle_check: { view: true },
      documents: { view: true, create: false, edit: false, delete: false, export: false },
      compliance: { view: true, create: false, edit: false, delete: false, export: false },
      proforma_invoice: { view: true, create: false, edit: false, delete: false, export: false },
      customers: { view: true, create: false, edit: false, delete: false, export: false },
      shipping: { view: true },
      policies: { view: true },
      tracking: { view: true },
      bookmarks: { view: true, create: false, edit: false, delete: false },
      my_records: { view: true },
    },
    admin: {
      manage_members: false,
      manage_roles: false,
      manage_settings: false,
      view_analytics: false,
      manage_billing: false,
    },
    data: { can_export: false, can_import: false, can_share: false },
  };
}

export function getSystemRolePermissions(roleName: SystemRoleName): PermissionConfig {
  switch (roleName) {
    case "owner": return createOwnerPermissions();
    case "admin": return createAdminPermissions();
    case "operator": return createOperatorPermissions();
    case "viewer": return createViewerPermissions();
  }
}

// ===== Permission Checking Utilities =====

export function canViewModule(permissions: PermissionConfig, moduleKey: string): boolean {
  const mod = permissions.modules[moduleKey];
  return mod?.view ?? false;
}

export function canCreateInModule(permissions: PermissionConfig, moduleKey: string): boolean {
  const mod = permissions.modules[moduleKey];
  return mod?.create ?? false;
}

export function canEditInModule(permissions: PermissionConfig, moduleKey: string): boolean {
  const mod = permissions.modules[moduleKey];
  return mod?.edit ?? false;
}

export function canDeleteInModule(permissions: PermissionConfig, moduleKey: string): boolean {
  const mod = permissions.modules[moduleKey];
  return mod?.delete ?? false;
}

export function canExportFromModule(permissions: PermissionConfig, moduleKey: string): boolean {
  const mod = permissions.modules[moduleKey];
  return mod?.export ?? false;
}

export function canManageMembers(permissions: PermissionConfig): boolean {
  return permissions.admin.manage_members;
}

export function canManageRoles(permissions: PermissionConfig): boolean {
  return permissions.admin.manage_roles;
}

export function canManageSettings(permissions: PermissionConfig): boolean {
  return permissions.admin.manage_settings;
}

export function canViewAnalytics(permissions: PermissionConfig): boolean {
  return permissions.admin.view_analytics;
}

export function canManageBilling(permissions: PermissionConfig): boolean {
  return permissions.admin.manage_billing;
}

export function canExportData(permissions: PermissionConfig): boolean {
  return permissions.data.can_export;
}

export function canImportData(permissions: PermissionConfig): boolean {
  return permissions.data.can_import;
}

// ===== Permission Comparison =====

export function isSystemRole(roleName: string): boolean {
  return ["owner", "admin", "operator", "viewer"].includes(roleName);
}

export function getRoleDisplayName(roleName: string): string {
  const names: Record<string, string> = {
    owner: "所有者",
    admin: "管理员",
    operator: "操作员",
    viewer: "只读成员",
  };
  return names[roleName] || roleName;
}

export function getRoleBadgeColor(roleName: string): string {
  const colors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    operator: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return colors[roleName] || "bg-gray-100 text-gray-800";
}

// ===== Empty Permission (for new custom roles) =====

export function createEmptyPermissions(): PermissionConfig {
  return {
    modules: {
      dashboard: { view: false },
      vehicle_check: { view: false },
      documents: { view: false, create: false, edit: false, delete: false, export: false },
      compliance: { view: false, create: false, edit: false, delete: false, export: false },
      proforma_invoice: { view: false, create: false, edit: false, delete: false, export: false },
      customers: { view: false, create: false, edit: false, delete: false, export: false },
      shipping: { view: false },
      policies: { view: false },
      tracking: { view: false },
      bookmarks: { view: false, create: false, edit: false, delete: false },
      my_records: { view: false },
    },
    admin: {
      manage_members: false,
      manage_roles: false,
      manage_settings: false,
      view_analytics: false,
      manage_billing: false,
    },
    data: { can_export: false, can_import: false, can_share: false },
  };
}

// Helper to get module permission with defaults
export function getModulePermission(permissions: PermissionConfig, moduleKey: string): ModulePermission {
  return permissions.modules[moduleKey] || { view: false, create: false, edit: false, delete: false, export: false };
}
