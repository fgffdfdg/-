import { getSupabaseClient } from "@/storage/database/supabase-client";
import type {
  Organization,
  OrganizationRole,
  OrganizationMember,
  OrganizationInvitation,
  PermissionConfig,
  MemberWithProfile,
} from "./types";
import { getSystemRolePermissions } from "./permissions";

// ===== Organization Service =====

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_members")
    .select("organization_id, organizations (*)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(`查询组织列表失败: ${error.message}`);

  return (data || []).map((m) => (m as { organization_id: string; organizations: any }).organizations as Organization).filter(Boolean);
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (error) throw new Error(`查询组织失败: ${error.message}`);
  return data as Organization | null;
}

export async function createOrganization(params: {
  name: string;
  slug: string;
  industry?: string;
  contact_email?: string;
  contact_phone?: string;
  userId: string;
}): Promise<Organization> {
  const client = getSupabaseClient();

  // Check slug uniqueness
  const { data: existing } = await client
    .from("organizations")
    .select("id")
    .eq("slug", params.slug)
    .maybeSingle();

  if (existing) {
    throw new Error("组织标识已被使用，请更换一个");
  }

  // Create organization
  const { data: org, error: orgError } = await client
    .from("organizations")
    .insert({
      name: params.name,
      slug: params.slug,
      industry: params.industry || null,
      contact_email: params.contact_email || null,
      contact_phone: params.contact_phone || null,
      plan_type: "free",
      plan_status: "active",
      max_members: 3,
      max_storage_mb: 100,
      status: "active",
    })
    .select()
    .single();

  if (orgError) throw new Error(`创建组织失败: ${orgError.message}`);
  const newOrg = org as Organization;

  // Create system roles
  const roleNames = ["owner", "admin", "operator", "viewer"] as const;
  const roleDescriptions = ["企业所有者，拥有全部权限", "管理员，可管理成员和设置", "操作员，可操作业务数据", "只读成员，仅可查看"];
  const defaultRoles = [false, false, true, false];

  const roleIds: Record<string, string> = {};

  for (let i = 0; i < roleNames.length; i++) {
    const roleName = roleNames[i];
    const permissions = getSystemRolePermissions(roleName);

    const { data: role, error: roleError } = await client
      .from("organization_roles")
      .insert({
        organization_id: newOrg.id,
        name: roleName,
        description: roleDescriptions[i],
        permissions: permissions as unknown as Record<string, unknown>,
        is_system: true,
        is_default: defaultRoles[i],
      })
      .select()
      .single();

    if (roleError) throw new Error(`创建角色失败: ${roleError.message}`);
    roleIds[roleName] = (role as OrganizationRole).id;
  }

  // Add creator as owner
  const { error: memberError } = await client
    .from("organization_members")
    .insert({
      organization_id: newOrg.id,
      user_id: params.userId,
      role_id: roleIds["owner"],
      status: "active",
      joined_at: new Date().toISOString(),
    });

  if (memberError) throw new Error(`添加所有者失败: ${memberError.message}`);

  return newOrg;
}

export async function updateOrganization(orgId: string, updates: Partial<Organization>): Promise<Organization> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organizations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw new Error(`更新组织失败: ${error.message}`);
  return data as Organization;
}

// ===== Member Service =====

export async function getOrganizationMembers(orgId: string): Promise<MemberWithProfile[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_members")
    .select("*, organization_roles (*)")
    .eq("organization_id", orgId)
    .in("status", ["active", "suspended"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(`查询成员列表失败: ${error.message}`);

  const members = (data || []) as Array<OrganizationMember & { organization_roles: OrganizationRole }>;

  // Fetch user profiles from Supabase Auth
  const userIds = members.map((m) => m.user_id);
  if (userIds.length === 0) return [];

  // We can't directly query auth.users, so we return members with role info
  return members.map((m) => ({
    ...m,
    role: m.organization_roles,
  }));
}

export async function getMemberByUserId(orgId: string, userId: string): Promise<MemberWithProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_members")
    .select("*, organization_roles (*)")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(`查询成员信息失败: ${error.message}`);
  if (!data) return null;

  const member = data as OrganizationMember & { organization_roles: OrganizationRole };
  return {
    ...member,
    role: member.organization_roles,
  };
}

export async function updateMemberRole(memberId: string, roleId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("organization_members")
    .update({ role_id: roleId, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) throw new Error(`更新成员角色失败: ${error.message}`);
}

export async function suspendMember(memberId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("organization_members")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) throw new Error(`停用成员失败: ${error.message}`);
}

export async function activateMember(memberId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("organization_members")
    .update({ status: "active", joined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) throw new Error(`激活成员失败: ${error.message}`);
}

export async function removeMember(memberId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) throw new Error(`移除成员失败: ${error.message}`);
}

export async function getMemberCount(orgId: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("status", ["active", "suspended"]);

  if (error) throw new Error(`统计成员数失败: ${error.message}`);
  return count || 0;
}

// ===== Role Service =====

export async function getOrganizationRoles(orgId: string): Promise<OrganizationRole[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_roles")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`查询角色列表失败: ${error.message}`);
  return (data || []) as OrganizationRole[];
}

export async function createCustomRole(orgId: string, name: string, description: string, permissions: PermissionConfig): Promise<OrganizationRole> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_roles")
    .insert({
      organization_id: orgId,
      name,
      description,
      permissions: permissions as unknown as Record<string, unknown>,
      is_system: false,
      is_default: false,
    })
    .select()
    .single();

  if (error) throw new Error(`创建角色失败: ${error.message}`);
  return data as OrganizationRole;
}

export async function updateRole(roleId: string, updates: { name?: string; description?: string; permissions?: PermissionConfig }): Promise<OrganizationRole> {
  const client = getSupabaseClient();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.permissions !== undefined) updateData.permissions = updates.permissions as unknown as Record<string, unknown>;

  const { data, error } = await client
    .from("organization_roles")
    .update(updateData)
    .eq("id", roleId)
    .select()
    .single();

  if (error) throw new Error(`更新角色失败: ${error.message}`);
  return data as OrganizationRole;
}

export async function deleteRole(roleId: string): Promise<void> {
  const client = getSupabaseClient();

  // Check if role is system role
  const { data: role } = await client
    .from("organization_roles")
    .select("is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (role && (role as OrganizationRole).is_system) {
    throw new Error("系统预设角色不能删除");
  }

  const { error } = await client
    .from("organization_roles")
    .delete()
    .eq("id", roleId);

  if (error) throw new Error(`删除角色失败: ${error.message}`);
}

// ===== Invitation Service =====

export async function createInvitation(orgId: string, email: string, roleId: string, invitedBy: string): Promise<OrganizationInvitation> {
  const client = getSupabaseClient();

  // Check if already a member
  const { data: existingMember } = await client
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  // Check for pending invitation
  const { data: existingInvitation } = await client
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvitation) {
    throw new Error("该邮箱已有待处理的邀请");
  }

  // Generate token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours

  const { data, error } = await client
    .from("organization_invitations")
    .insert({
      organization_id: orgId,
      email,
      role_id: roleId,
      token,
      invited_by: invitedBy,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(`创建邀请失败: ${error.message}`);
  return data as OrganizationInvitation;
}

export async function getInvitationByToken(token: string): Promise<(OrganizationInvitation & { organizations: Organization; organization_roles: OrganizationRole }) | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_invitations")
    .select("*, organizations(*), organization_roles(*)")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle();

  if (error) throw new Error(`查询邀请失败: ${error.message}`);
  if (!data) return null;

  const invitation = data as OrganizationInvitation & {
    organizations: Organization;
    organization_roles: OrganizationRole;
  };

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await client
      .from("organization_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return null;
  }

  return invitation;
}

export async function acceptInvitation(token: string, userId: string): Promise<Organization> {
  const client = getSupabaseClient();

  // Get invitation
  const { data: invData, error: invError } = await client
    .from("organization_invitations")
    .select("*, organizations(*)")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle();

  if (invError) throw new Error(`查询邀请失败: ${invError.message}`);
  if (!invData) throw new Error("邀请不存在或已过期");

  const invitation = invData as OrganizationInvitation & { organizations: Organization };

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error("邀请已过期");
  }

  // Check member limit
  const memberCount = await getMemberCount(invitation.organization_id);
  if (memberCount >= invitation.organizations.max_members) {
    throw new Error("组织成员数已达上限");
  }

  // Check if user is already a member
  const { data: existingMember } = await client
    .from("organization_members")
    .select("id")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    throw new Error("你已经是该组织的成员");
  }

  // Add member
  const { error: memberError } = await client
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role_id: invitation.role_id,
      status: "active",
      joined_at: new Date().toISOString(),
      invited_by: invitation.invited_by,
    });

  if (memberError) throw new Error(`加入组织失败: ${memberError.message}`);

  // Mark invitation as accepted
  await client
    .from("organization_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  // Migrate user's existing data to this organization (for new users joining)
  await migrateUserDataToOrg(userId, invitation.organization_id);

  return invitation.organizations;
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from("organization_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);

  if (error) throw new Error(`取消邀请失败: ${error.message}`);
}

export async function getOrganizationInvitations(orgId: string): Promise<Array<OrganizationInvitation & { organization_roles: OrganizationRole }>> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organization_invitations")
    .select("*, organization_roles(*)")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`查询邀请列表失败: ${error.message}`);
  return (data || []) as Array<OrganizationInvitation & { organization_roles: OrganizationRole }>;
}

// ===== Data Migration Helper =====

async function migrateUserDataToOrg(userId: string, orgId: string): Promise<void> {
  const client = getSupabaseClient();
  const tables = [
    "proforma_invoices",
    "compliance_declarations",
    "customers",
    "company_profiles",
    "bank_accounts",
    "saved_documents",
    "document_drafts",
    "export_declarations",
    "bookmarks",
    "user_saved_urls",
  ];

  for (const table of tables) {
    const { error } = await client
      .from(table)
      .update({ organization_id: orgId })
      .eq("user_id", userId)
      .is("organization_id", null);

    if (error) {
      console.error(`迁移 ${table} 数据失败:`, error.message);
    }
  }
}

// ===== Current Organization Context (Server-side) =====

export async function getCurrentOrgContext(userId: string, orgId?: string): Promise<{
  organization: Organization | null;
  membership: MemberWithProfile | null;
}> {
  const client = getSupabaseClient();

  if (orgId) {
    const membership = await getMemberByUserId(orgId, userId);
    if (!membership) return { organization: null, membership: null };
    const organization = await getOrganizationById(orgId);
    return { organization, membership };
  }

  // Get user's first (or default) organization
  const orgs = await getUserOrganizations(userId);
  if (orgs.length === 0) return { organization: null, membership: null };

  const defaultOrg = orgs[0];
  const membership = await getMemberByUserId(defaultOrg.id, userId);
  return { organization: defaultOrg, membership };
}
