"use client";

import { useOrg } from "./context";
import {
  canViewModule,
  canCreateInModule,
  canEditInModule,
  canDeleteInModule,
  canExportFromModule,
  canManageMembers,
  canManageRoles,
  canManageSettings,
  canExportData,
} from "./permissions";

// ===== Module Permission Hooks =====

export function useModulePermission(moduleKey: string) {
  const { permissions } = useOrg();

  if (!permissions) {
    return { canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false };
  }

  return {
    canView: canViewModule(permissions, moduleKey),
    canCreate: canCreateInModule(permissions, moduleKey),
    canEdit: canEditInModule(permissions, moduleKey),
    canDelete: canDeleteInModule(permissions, moduleKey),
    canExport: canExportFromModule(permissions, moduleKey),
  };
}

// ===== Admin Permission Hooks =====

export function useAdminPermission() {
  const { permissions } = useOrg();

  if (!permissions) {
    return {
      canManageMembers: false,
      canManageRoles: false,
      canManageSettings: false,
      canExportData: false,
      isOwner: false,
      isAdmin: false,
    };
  }

  return {
    canManageMembers: canManageMembers(permissions),
    canManageRoles: canManageRoles(permissions),
    canManageSettings: canManageSettings(permissions),
    canExportData: canExportData(permissions),
    isOwner: permissions.admin.manage_billing, // Only owner has billing access
    isAdmin: canManageMembers(permissions), // Admin and owner can manage members
  };
}

// ===== Organization Info Hooks =====

export function useOrgId(): string | null {
  const { organization } = useOrg();
  return organization?.id ?? null;
}

export function useOrgName(): string {
  const { organization } = useOrg();
  return organization?.name ?? "";
}

export function useIsOrgLoading(): boolean {
  const { isLoading } = useOrg();
  return isLoading;
}

export function useHasOrg(): boolean {
  const { organization } = useOrg();
  return organization !== null;
}

export function useRoleName(): string {
  const { role } = useOrg();
  return role?.name ?? "";
}

export function useIsOwner(): boolean {
  const { permissions } = useOrg();
  return permissions?.admin.manage_billing ?? false;
}

export function useIsAdmin(): boolean {
  const { permissions } = useOrg();
  return permissions?.admin.manage_members ?? false;
}
