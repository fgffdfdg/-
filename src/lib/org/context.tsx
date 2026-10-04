"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getSupabaseBrowserClientWithRetry } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import type { Organization, OrganizationMember, OrganizationRole, PermissionConfig, OrgContext } from "./types";

const OrgContextInternal = createContext<OrgContext | null>(null);

const CURRENT_ORG_KEY = "exportdrive_current_org_id";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionConfig | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgData = useCallback(async (userId: string, targetOrgId?: string) => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();

      // Fetch user's organizations
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("*, organizations (*), organization_roles (*)")
        .eq("user_id", userId)
        .eq("status", "active");

      if (memberError) throw memberError;

      const members = memberData || [];
      const orgs = members.map((m: { organizations: Organization }) => m.organizations);
      setOrganizations(orgs);

      if (orgs.length === 0) {
        // Auto-create a personal organization for new users
        try {
          if (token) {
            const response = await fetch("/api/organizations/auto-create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                // Re-fetch org data to get the newly created org
                const { data: newMemberData } = await supabase
                  .from("organization_members")
                  .select("*, organizations (*), organization_roles (*)")
                  .eq("user_id", userId)
                  .eq("status", "active");

                if (newMemberData && newMemberData.length > 0) {
                  const newMembers = newMemberData;
                  const newOrgs = newMembers.map((m: { organizations: Organization }) => m.organizations);
                  setOrganizations(newOrgs);

                  const newMemberEntry = newMembers[0];
                  const newOrg = newMemberEntry.organizations as Organization;
                  const newMember = newMemberEntry as unknown as OrganizationMember;
                  const newMemberRole = (newMemberEntry as { organization_roles: OrganizationRole }).organization_roles;

                  setOrganization(newOrg);
                  setMembership(newMember);
                  setRole(newMemberRole);
                  setPermissions(newMemberRole.permissions as unknown as PermissionConfig);
                  localStorage.setItem(CURRENT_ORG_KEY, newOrg.id);
                  setIsLoading(false);
                  return;
                }
              }
            }
          }
        } catch (autoCreateError) {
          console.error("Auto-create organization failed:", autoCreateError);
        }
        setIsLoading(false);
        return;
      }

      // Determine which org to use
      let selectedOrgId = targetOrgId;
      if (!selectedOrgId) {
        selectedOrgId = typeof window !== "undefined" ? localStorage.getItem(CURRENT_ORG_KEY) || undefined : undefined;
      }

      // Find the matching member entry
      const memberEntry = members.find((m: { organizations: Organization }) =>
        m.organizations.id === selectedOrgId
      ) || members[0];

      const org = memberEntry.organizations as Organization;
      const member = memberEntry as unknown as OrganizationMember;
      const memberRole = (memberEntry as { organization_roles: OrganizationRole }).organization_roles;

      setOrganization(org);
      setMembership(member);
      setRole(memberRole);
      setPermissions(memberRole.permissions as unknown as PermissionConfig);

      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENT_ORG_KEY, org.id);
      }
    } catch (err) {
      console.error("Failed to fetch organization data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const switchOrganization = useCallback(async (orgId: string) => {
    setIsLoading(true);
    try {
      if (!user) return;
      await fetchOrgData(user.id, orgId);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrgData, user]);

  const refreshOrganization = useCallback(async () => {
    try {
      if (!user) return;
      await fetchOrgData(user.id, organization?.id);
    } catch (err) {
      console.error("Failed to refresh organization:", err);
    }
  }, [fetchOrgData, user, organization?.id]);

  // 当全局 auth user 变化时，自动加载组织数据
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!user) {
        if (mounted) {
          setOrganization(null);
          setMembership(null);
          setRole(null);
          setPermissions(null);
          setOrganizations([]);
          setIsLoading(false);
        }
        return;
      }
      await fetchOrgData(user.id);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: OrgContext = {
    organization,
    currentOrgId: organization?.id ?? null,
    membership,
    role,
    permissions,
    organizations,
    isLoading,
    switchOrganization,
    refreshOrganization,
  };

  return (
    <OrgContextInternal.Provider value={value}>
      {children}
    </OrgContextInternal.Provider>
  );
}

export function useOrg(): OrgContext {
  const context = useContext(OrgContextInternal);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

export function useOptionalOrg(): OrgContext | null {
  return useContext(OrgContextInternal);
}
