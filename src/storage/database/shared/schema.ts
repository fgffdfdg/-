import { pgTable, serial, timestamp, index, foreignKey, pgPolicy, uuid, text, date, jsonb, unique, varchar, check, boolean, integer, bigint, doublePrecision, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



// Reference to Supabase Auth users table (managed by auth.users)
export const users = pgTable("auth_users_ref", {
  id: uuid("id").primaryKey().notNull(),
});

// Alias for backward compatibility with relations.ts
export const usersInAuth = users;

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const exportDeclarations = pgTable("export_declarations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	companyName: text("company_name").notNull(),
	companyCode: text("company_code").notNull(),
	recipient: text().default('海关 / 相关监管部门'),
	declarationDate: date("declaration_date"),
	vehicles: jsonb().default([]),
	status: text().default('draft'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("export_declarations_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_export_declarations_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "export_declarations_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "export_declarations_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can delete own declarations", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert own declarations", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own declarations", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own declarations", { as: "permissive", for: "select", to: ["public"] }),
]);

export const organizationInvitations = pgTable("organization_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	email: text().notNull(),
	roleId: uuid("role_id"),
	token: text().notNull(),
	invitedBy: uuid("invited_by"),
	status: text().default('pending').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("organization_invitations_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("organization_invitations_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("organization_invitations_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_invitations_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [organizationRoles.id],
			name: "organization_invitations_role_id_fkey"
		}).onDelete("set null"),
	unique("organization_invitations_token_key").on(table.token),
]);

export const proformaInvoices = pgTable("proforma_invoices", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	title: varchar({ length: 200 }).default('未命名发票').notNull(),
	buyerInfo: jsonb("buyer_info").notNull(),
	orderInfo: jsonb("order_info").notNull(),
	vehicles: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	customerId: uuid("customer_id"),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("proforma_invoices_customer_id_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("proforma_invoices_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("proforma_invoices_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	index("proforma_invoices_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "proforma_invoices_customer_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "proforma_invoices_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("proforma_invoices_用户删除自己的数据", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
	pgPolicy("proforma_invoices_用户插入自己的数据", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("proforma_invoices_用户更新自己的数据", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("proforma_invoices_用户读取自己的数据", { as: "permissive", for: "select", to: ["public"] }),
]);

export const savedDocuments = pgTable("saved_documents", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	docType: varchar("doc_type", { length: 20 }).notNull(),
	title: varchar({ length: 200 }).default('未命名单证').notNull(),
	docNo: varchar("doc_no", { length: 100 }),
	docData: jsonb("doc_data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("saved_documents_doc_type_idx").using("btree", table.docType.asc().nullsLast().op("text_ops")),
	index("saved_documents_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("saved_documents_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("saved_documents_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "saved_documents_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("saved_documents_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("saved_documents_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("saved_documents_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("saved_documents_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("saved_documents_doc_type_check", sql`(doc_type)::text = ANY ((ARRAY['invoice'::character varying, 'packing-list'::character varying, 'contract'::character varying, 'declaration'::character varying, 'customs'::character varying, 'trade'::character varying])::text[])`),
]);

export const companyProfiles = pgTable("company_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	companyName: text("company_name"),
	socialCreditCode: text("social_credit_code"),
	legalPerson: text("legal_person"),
	contactPhone: text("contact_phone"),
	contactEmail: text("contact_email"),
	address: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	companyNameEn: text("company_name_en"),
	addressEn: text("address_en"),
		notes: text("notes"),
	isDefault: boolean("is_default").default(false),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("company_profiles_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "company_profiles_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "company_profiles_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can delete own company", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert own company", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own company", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own company", { as: "permissive", for: "select", to: ["public"] }),
]);

export const bankAccounts = pgTable("bank_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	accountName: text("account_name").notNull(),
	bankName: text("bank_name").notNull(),
	accountNumber: text("account_number").notNull(),
	swiftCode: text("swift_code"),
	bankAddress: text("bank_address"),
	remark: text(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	accountNameEn: text("account_name_en"),
	bankNameEn: text("bank_name_en"),
	bankAddressEn: text("bank_address_en"),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("bank_accounts_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bank_accounts_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "bank_accounts_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can delete own bank accounts", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert own bank accounts", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own bank accounts", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own bank accounts", { as: "permissive", for: "select", to: ["public"] }),
]);

export const complianceDeclarations = pgTable("compliance_declarations", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	title: varchar({ length: 200 }).default('未命名声明').notNull(),
	companyInfo: jsonb("company_info").notNull(),
	vehicles: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("compliance_declarations_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("compliance_declarations_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	index("compliance_declarations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "compliance_declarations_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("compliance_declarations_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("compliance_declarations_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("compliance_declarations_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("compliance_declarations_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

export const bookmarks = pgTable("bookmarks", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	title: varchar({ length: 200 }).notNull(),
	url: text().notNull(),
	description: text().default(''),
	category: varchar({ length: 100 }).default(''),
	username: varchar({ length: 200 }).default(''),
	password: varchar({ length: 500 }).default(''),
	faviconUrl: text("favicon_url").default(''),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("bookmarks_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("bookmarks_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("bookmarks_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "bookmarks_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("bookmarks_用户删除自己的数据", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("bookmarks_用户插入自己的数据", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("bookmarks_用户更新自己的数据", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("bookmarks_用户读取自己的数据", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userSavedUrls = pgTable("user_saved_urls", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	category: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	url: text().notNull(),
	city: varchar({ length: 100 }),
	notes: text(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("idx_user_saved_urls_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_user_saved_urls_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_saved_urls_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_saved_urls_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "user_saved_urls_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can delete their own saved URLs", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert their own saved URLs", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update their own saved URLs", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view their own saved URLs", { as: "permissive", for: "select", to: ["public"] }),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	companyName: text("company_name").default('未命名客户').notNull(),
	companyNameEn: text("company_name_en"),
	contactName: text("contact_name"),
	contactPhone: text("contact_phone"),
	contactEmail: text("contact_email"),
	country: text(),
	city: text(),
	address: text(),
	addressEn: text("address_en"),
	tags: jsonb().default([]),
	status: text().default('potential').notNull(),
	notes: text(),
	source: text(),
	website: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("customers_country_idx").using("btree", table.country.asc().nullsLast().op("text_ops")),
	index("customers_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("customers_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("customers_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("customers_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "customers_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("customers_用户删除自己的客户", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("customers_用户插入自己的客户", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("customers_用户更新自己的客户", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("customers_用户读取自己的客户", { as: "permissive", for: "select", to: ["public"] }),
	check("customers_status_check", sql`status = ANY (ARRAY['active'::text, 'potential'::text, 'inactive'::text])`),
]);

export const blogPosts = pgTable("blog_posts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 200 }).notNull(),
	content: text().default('').notNull(),
	excerpt: text(),
	coverImage: text("cover_image"),
	authorName: varchar("author_name", { length: 100 }).default('汽车出口通').notNull(),
	tags: text().array().default([""]),
	status: varchar({ length: 20 }).default('draft').notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	metaTitle: varchar("meta_title", { length: 200 }),
	metaDescription: text("meta_description"),
}, (table) => [
	index("idx_blog_posts_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_blog_posts_published_at").using("btree", table.publishedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_blog_posts_slug").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("idx_blog_posts_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("blog_posts_slug_key").on(table.slug),
]);

export const adminUsers = pgTable("admin_users", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	role: varchar({ length: 20 }).default('admin').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("admin_users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("admin_users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	unique("admin_users_email_key").on(table.email),
]);

export const exportLicenses = pgTable("export_licenses", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	licenseNo: text("license_no").notNull(),
	fileName: text("file_name").notNull(),
	fileKey: text("file_key").notNull(),
	fileMime: text("file_mime").notNull(),
	fileSize: integer("file_size").default(0).notNull(),
	vins: text().array().notNull(),
	exporter: text(),
	issueDate: date("issue_date"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("export_licenses_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("export_licenses_license_no_idx").using("btree", table.licenseNo.asc().nullsLast().op("text_ops")),
	index("export_licenses_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("export_licenses_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "export_licenses_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("export_licenses_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
	pgPolicy("export_licenses_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("export_licenses_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("export_licenses_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

export const licenseDrafts = pgTable("license_drafts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	draftNo: text("draft_no").notNull(),
	title: text().default('').notNull(),
	exporter: text().default('').notNull(),
	country: text().default('').notNull(),
	vehicleCount: integer("vehicle_count").default(0).notNull(),
	totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default('0').notNull(),
	status: text().default('draft').notNull(),
	contractNo: text("contract_no"),
	vins: text().array(),
	brand: text(),
	model: text(),
	mainData: jsonb("main_data").default({}).notNull(),
	annexData: jsonb("annex_data").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("license_drafts_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("license_drafts_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("license_drafts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organizations.id],
		name: "license_drafts_organization_id_fkey"
	}).onDelete("set null"),
	pgPolicy("license_drafts_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
	pgPolicy("license_drafts_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("license_drafts_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("license_drafts_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

/** @deprecated 使用 savedDocuments 表替代。saved_documents 使用 JSONB 存储完整表单数据，更灵活。旧表仅保留用于数据迁移。 */
export const documentDrafts = pgTable("document_drafts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	docType: text("doc_type").notNull(),
	invoiceNo: text("invoice_no"),
	invoiceDate: date("invoice_date"),
	contractNo: text("contract_no"),
	contractDate: date("contract_date"),
	sellerName: text("seller_name"),
	sellerNameEn: text("seller_name_en"),
	sellerAddress: text("seller_address"),
	sellerAddressEn: text("seller_address_en"),
	sellerPhone: text("seller_phone"),
	sellerFax: text("seller_fax"),
	sellerEmail: text("seller_email"),
	buyerName: text("buyer_name"),
	buyerNameEn: text("buyer_name_en"),
	buyerAddress: text("buyer_address"),
	buyerAddressEn: text("buyer_address_en"),
	buyerPhone: text("buyer_phone"),
	buyerFax: text("buyer_fax"),
	buyerEmail: text("buyer_email"),
	consigneeName: text("consignee_name"),
	consigneeNameEn: text("consignee_name_en"),
	consigneeAddress: text("consignee_address"),
	consigneeAddressEn: text("consignee_address_en"),
	consigneePhone: text("consignee_phone"),
	consigneeEmail: text("consignee_email"),
	sameAsBuyer: boolean("same_as_buyer").default(false),
	portOfLoading: text("port_of_loading"),
	portOfLoadingEn: text("port_of_loading_en"),
	portOfDischarge: text("port_of_discharge"),
	portOfDischargeEn: text("port_of_discharge_en"),
	transportMode: text("transport_mode"),
	shipmentDate: text("shipment_date"),
	partialShipment: boolean("partial_shipment").default(false),
	transshipment: boolean().default(false),
	paymentTerms: text("payment_terms"),
	incoterm: text(),
	currency: text().default('USD'),
	vehicles: jsonb().default([]),
	remarks: text(),
	remarksEn: text("remarks_en"),
	status: text().default('draft'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid("organization_id"),
}, (table) => [
	index("document_drafts_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_drafts_type").using("btree", table.docType.asc().nullsLast().op("text_ops")),
	index("idx_document_drafts_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "document_drafts_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "document_drafts_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can delete own drafts", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can insert own drafts", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own drafts", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view own drafts", { as: "permissive", for: "select", to: ["public"] }),
]);

export const organizationRoles = pgTable("organization_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	name: text().notNull(),
	description: text(),
	permissions: jsonb().default({}).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("organization_roles_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_roles_organization_id_fkey"
		}).onDelete("cascade"),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	industry: text(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	logoUrl: text("logo_url"),
	planType: text("plan_type").default('free').notNull(),
	planStatus: text("plan_status").default('active').notNull(),
	maxMembers: integer("max_members").default(3).notNull(),
	maxStorageMb: integer("max_storage_mb").default(100).notNull(),
	settings: jsonb().default({}),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("organizations_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("organizations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("organizations_slug_key").on(table.slug),
]);

export const organizationMembers = pgTable("organization_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id"),
	status: text().default('active').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	invitedBy: uuid("invited_by"),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("organization_members_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("organization_members_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("organization_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_members_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [organizationRoles.id],
			name: "organization_members_role_id_fkey"
		}).onDelete("set null"),
	unique("organization_members_organization_id_user_id_key").on(table.organizationId, table.userId),
]);

export const contractDocuments = pgTable("contract_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id"),
	contractNo: varchar("contract_no", { length: 200 }),
	invoiceNo: varchar("invoice_no", { length: 200 }),
	packingListNo: varchar("packing_list_no", { length: 200 }),
	vins: text().array().default([""]),
	fileKey: text("file_key"),
	fileName: varchar("file_name", { length: 500 }),
	fileMime: varchar("file_mime", { length: 200 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	status: varchar({ length: 20 }).default('draft').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_contract_documents_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_contract_documents_org_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_contract_documents_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_contract_documents_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_contract_documents_vins").using("gin", table.vins.asc().nullsLast().op("array_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "contract_documents_organization_id_fkey"
		}).onDelete("set null"),
	pgPolicy("contract_documents_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("contract_documents_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("contract_documents_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("contract_documents_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("contract_documents_status_check", sql`(status)::text = ANY ((ARRAY['draft'::character varying, 'official'::character varying, 'archived'::character varying])::text[])`),
]);

export const paymentAccounts = pgTable("payment_accounts", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payment_accounts_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("payment_accounts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("payment_accounts_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "payment_accounts_organization_id_fkey"
	}).onDelete("set null"),
	pgPolicy("payment_accounts_用户读取自己的数据", { as: "permissive", for: "select", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
	pgPolicy("payment_accounts_用户插入自己的数据", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("payment_accounts_用户更新自己的数据", { as: "permissive", for: "update", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
	pgPolicy("payment_accounts_用户删除自己的数据", { as: "permissive", for: "delete", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
]);

export const invoiceTitles = pgTable("invoice_titles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	titleType: text("title_type").notNull(),
	companyName: text("company_name").notNull(),
	companyNameEn: text("company_name_en"),
	taxId: text("tax_id"),
	overseasTaxId: text("overseas_tax_id"),
	address: text(),
	addressEn: text("address_en"),
	phone: text(),
	bankName: text("bank_name"),
	bankAccount: text("bank_account"),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	country: text(),
	city: text(),
	shippingAddress: text("shipping_address"),
	tags: jsonb().default([]).notNull(),
	remark: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("invoice_titles_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("invoice_titles_title_type_idx").using("btree", table.titleType.asc().nullsLast().op("text_ops")),
	index("invoice_titles_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("invoice_titles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("invoice_titles_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("invoice_titles_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("invoice_titles_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("invoice_titles_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("invoice_titles_title_type_check", sql`title_type = ANY (ARRAY['own_company'::text, 'partner'::text])`),
]);

export const taxBureauFavorites = pgTable("tax_bureau_favorites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	name: text().notNull(),
	url: text().notNull(),
	siteType: text("site_type").notNull(),
	region: text().default('全国').notNull(),
	description: text(),
	businessTags: jsonb("business_tags").default([]).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("tax_bureau_favorites_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("tax_bureau_favorites_site_type_idx").using("btree", table.siteType.asc().nullsLast().op("text_ops")),
	index("tax_bureau_favorites_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("tax_bureau_favorites_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("tax_bureau_favorites_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("tax_bureau_favorites_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("tax_bureau_favorites_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("tax_bureau_favorites_site_type_check", sql`site_type = ANY (ARRAY['national'::text, 'provincial'::text, 'business_system'::text])`),
]);

export const customsDeclarations = pgTable("customs_declarations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id"),
	entryNo: text("entry_no").notNull(),
	customsNo: text("customs_no"),
	contractNo: text("contract_no"),
	consigneeName: text("consignee_name"),
	tradeCountryCode: text("trade_country_code"),
	arrivalCountryCode: text("arrival_country_code"),
	exitCustomsCode: text("exit_customs_code"),
	transportModeCode: text("transport_mode_code"),
	itemCount: integer("item_count").default(0).notNull(),
	totalQuantity: integer("total_quantity").default(0).notNull(),
	totalAmount: integer("total_amount").default(0).notNull(),
	currencyCode: text("currency_code"),
	exportDate: date("export_date"),
	declareDate: date("declare_date"),
	status: text().default('draft').notNull(),
	data: jsonb().notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customs_declarations_entry_no_idx").using("btree", table.entryNo.asc().nullsLast().op("text_ops")),
	index("customs_declarations_export_date_idx").using("btree", table.exportDate.asc().nullsLast().op("date_ops")),
	index("customs_declarations_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("customs_declarations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("customs_declarations_updated_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "customs_declarations_organization_id_fkey"
		}).onDelete("set null"),
]);

export const vehicleArchives = pgTable("vehicle_archives", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	vin: varchar({ length: 17 }),
	plateNumber: varchar("plate_number", { length: 20 }),
	vehicleOrigin: varchar("vehicle_origin", { length: 50 }),
	vehicleType: varchar("vehicle_type", { length: 50 }),
	brand: varchar({ length: 50 }),
	model: varchar({ length: 100 }),
	brandModel: varchar("brand_model", { length: 150 }),
	engineNumber: varchar("engine_number", { length: 50 }),
	engineModel: varchar("engine_model", { length: 50 }),
	displacement: varchar({ length: 20 }),
	power: varchar({ length: 20 }),
	fuelType: varchar("fuel_type", { length: 20 }),
	emissionStandard: varchar("emission_standard", { length: 20 }),
	color: varchar({ length: 20 }),
	manufacturer: varchar({ length: 100 }),
	isNewEnergy: boolean("is_new_energy").default(false),
	ownerName: varchar("owner_name", { length: 100 }),
	ownerAddress: text("owner_address"),
	usageNature: varchar("usage_nature", { length: 30 }),
	registrationDate: date("registration_date"),
	issueDate: date("issue_date"),
	registrationAuthority: varchar("registration_authority", { length: 100 }),
	idNumber: varchar("id_number", { length: 50 }),
	acquisitionMethod: varchar("acquisition_method", { length: 50 }),
	grossMass: varchar("gross_mass", { length: 20 }),
	curbWeight: varchar("curb_weight", { length: 20 }),
	seatingCapacity: varchar("seating_capacity", { length: 10 }),
	dimensions: varchar({ length: 50 }),
	steeringType: varchar("steering_type", { length: 20 }),
	axles: varchar({ length: 20 }),
	wheelbase: varchar({ length: 20 }),
	tireCount: varchar("tire_count", { length: 10 }),
	ratedLoad: varchar("rated_load", { length: 20 }),
	towingCapacity: varchar("towing_capacity", { length: 20 }),
	cargoDimensions: varchar("cargo_dimensions", { length: 50 }),
	transferRecords: jsonb("transfer_records"),
	mortgageRecords: jsonb("mortgage_records"),
	drivingLicenseImageUrl: text("driving_license_image_url"),
	registrationCertImageUrl: text("registration_cert_image_url"),
	customModelName: varchar("custom_model_name", { length: 100 }),
	modelRemark: text("model_remark"),
	tags: jsonb().default([]).notNull(),
	notes: text(),
	customFields: jsonb("custom_fields").default({}).notNull(),
	source: varchar({ length: 20 }).default('manual').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("vehicle_archives_brand_idx").using("btree", table.brand.asc().nullsLast().op("text_ops")),
	index("vehicle_archives_custom_model_idx").using("btree", table.customModelName.asc().nullsLast().op("text_ops")),
	index("vehicle_archives_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("vehicle_archives_plate_number_idx").using("btree", table.plateNumber.asc().nullsLast().op("text_ops")),
	index("vehicle_archives_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("vehicle_archives_updated_at_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("vehicle_archives_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("vehicle_archives_vin_idx").using("btree", table.vin.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "vehicle_archives_organization_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "vehicle_archives_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("vehicle_archives_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("vehicle_archives_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("vehicle_archives_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("vehicle_archives_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("vehicle_archives_source_check", sql`(source)::text = ANY ((ARRAY['manual'::character varying, 'ocr_license'::character varying, 'ocr_cert'::character varying, 'ocr_both'::character varying, 'vin_query'::character varying])::text[])`),
	check("vehicle_archives_status_check", sql`(status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'temporary'::character varying])::text[])`),
]);

// ============ 车况检测报告 ============

export const vehicleInspectionReports = pgTable("vehicle_inspection_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	vehicleId: uuid("vehicle_id").notNull().references(() => vehicleArchives.id, { onDelete: "cascade" }),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	reportType: varchar("report_type", { length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	reportOrderId: uuid("report_order_id"),
		orderId: varchar("order_id", { length: 100 }),
	reportData: jsonb("report_data").default({}),
		costCents: integer("cost_cents").default(0).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("vip_reports_vehicle_id_idx").using("btree", table.vehicleId.asc().nullsLast().op("uuid_ops")),
	index("vip_reports_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("vip_reports_type_idx").using("btree", table.reportType.asc().nullsLast().op("text_ops")),
	index("vip_reports_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
		index("vip_reports_report_order_id_idx").using("btree", table.reportOrderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.vehicleId],
		foreignColumns: [vehicleArchives.id],
		name: "vip_reports_vehicle_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organizations.id],
		name: "vip_reports_organization_id_fkey"
	}).onDelete("set null"),
	pgPolicy("vip_reports_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("vip_reports_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("vip_reports_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("vip_reports_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("vip_reports_type_check", sql`(report_type)::text = ANY ((ARRAY['insurance'::character varying, 'mileage'::character varying, 'battery'::character varying, 'technical'::character varying, 'maintenance'::character varying, 'accident'::character varying])::text[])`),
	check("vip_reports_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'querying'::character varying, 'completed'::character varying, 'failed'::character varying, 'no_data'::character varying, 'expired'::character varying])::text[])`),
]);


// ============ 报告订单 ============

export const reportOrders = pgTable("report_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	vehicleId: uuid("vehicle_id").notNull().references(() => vehicleArchives.id, { onDelete: "cascade" }),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
	createdBy: uuid("created_by").notNull(),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	financialStatus: varchar("financial_status", { length: 20 }).default('pending').notNull(),
	costCents: integer("cost_cents").default(0).notNull(),
	queryParams: jsonb("query_params").default({}),
	resultSummary: text("result_summary"),
	errorMessage: text("error_message"),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_report_orders_vehicle_id").using("btree", table.vehicleId.asc().nullsLast().op("uuid_ops")),
	index("idx_report_orders_organization_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_report_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_report_orders_created_by").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.vehicleId],
		foreignColumns: [vehicleArchives.id],
		name: "report_orders_vehicle_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organizations.id],
		name: "report_orders_organization_id_fkey"
	}).onDelete("cascade"),
	pgPolicy("report_orders_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("report_orders_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("report_orders_update_own", { as: "permissive", for: "update", to: ["public"] }),
	check("report_orders_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'querying'::character varying, 'completed'::character varying, 'failed'::character varying, 'no_data'::character varying, 'expired'::character varying])::text[])`),
	check("report_orders_financial_status_check", sql`(financial_status)::text = ANY ((ARRAY['pending'::character varying, 'charged'::character varying, 'refunded'::character varying, 'not_charged'::character varying])::text[])`),
]);

// ============ 运输跟踪模块 ============

export const transportRecords = pgTable("transport_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	// 编号体系
	trackingNumber: varchar("tracking_number", { length: 50 }).notNull().unique(),
	blNumber: varchar("bl_number", { length: 100 }),
	carrierTrackingNumber: varchar("carrier_tracking_number", { length: 100 }),
	// 船舶信息
	vesselName: varchar("vessel_name", { length: 200 }),
	imo: varchar({ length: 20 }),
	voyage: varchar({ length: 50 }),
	// 港口
	exportPortCode: varchar("export_port_code", { length: 20 }),
	exportPortName: varchar("export_port_name", { length: 200 }),
	destPortCode: varchar("dest_port_code", { length: 20 }),
	destPortName: varchar("dest_port_name", { length: 200 }),
	// 时间
	etd: date("etd"),
	eta: date("eta"),
	ata: timestamp("ata", { withTimezone: true }),
	// ETA 来源
	etaSource: varchar("eta_source", { length: 50 }).default('carrier'),
	etaUpdatedAt: timestamp("eta_updated_at", { withTimezone: true }),
	// 位置
	lastPositionLat: doublePrecision("last_position_lat"),
	lastPositionLng: doublePrecision("last_position_lng"),
	lastPositionLabel: varchar("last_position_label", { length: 300 }),
	lastPositionTime: timestamp("last_position_time", { withTimezone: true }),
	// 进度
	remainingDistance: numeric("remaining_distance", { precision: 10, scale: 1 }),
	progress: integer().default(0),
	// 状态
	status: varchar({ length: 30 }).default('pending_shipment').notNull(),
	containerCount: integer("container_count").default(0),
	vehicleCount: integer("vehicle_count").default(0),
	isDemo: boolean("is_demo").default(false).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	// 数据来源
	dataSource: varchar("data_source", { length: 50 }).default('manual'),
	dataUpdatedAt: timestamp("data_updated_at", { withTimezone: true }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transport_records_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("transport_records_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("transport_records_bl_number_idx").using("btree", table.blNumber.asc().nullsLast().op("text_ops")),
	index("transport_records_carrier_tracking_idx").using("btree", table.carrierTrackingNumber.asc().nullsLast().op("text_ops")),
	index("transport_records_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("transport_records_eta_idx").using("btree", table.eta.asc().nullsLast().op("date_ops")),
	index("transport_records_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("transport_records_tracking_number_idx").using("btree", table.trackingNumber.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "transport_records_user_id_fkey"
	}).onDelete("cascade"),
	pgPolicy("transport_records_delete_org", { as: "permissive", for: "delete", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	pgPolicy("transport_records_insert_org", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_records_select_org", { as: "permissive", for: "select", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	pgPolicy("transport_records_update_org", { as: "permissive", for: "update", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	check("transport_records_status_check", sql`(status)::text = ANY ((ARRAY['pending_shipment'::character varying, 'awaiting_departure'::character varying, 'at_sea'::character varying, 'in_transit'::character varying, 'arrived'::character varying, 'customs_clearance'::character varying, 'delivered'::character varying, 'exception'::character varying, 'cancelled'::character varying])::text[])`),
]);

export const transportContainers = pgTable("transport_containers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recordId: uuid("record_id").notNull().references(() => transportRecords.id, { onDelete: "cascade" }),
	containerNumber: varchar("container_number", { length: 50 }).notNull(),
	status: varchar({ length: 30 }).default('normal'),
	sealNumber: varchar("seal_number", { length: 50 }),
	containerType: varchar("container_type", { length: 20 }).default('40HQ'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transport_containers_record_id_idx").using("btree", table.recordId.asc().nullsLast().op("uuid_ops")),
	index("transport_containers_number_idx").using("btree", table.containerNumber.asc().nullsLast().op("text_ops")),
	pgPolicy("transport_containers_delete_org", { as: "permissive", for: "delete", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_containers_insert_org", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_containers_select_org", { as: "permissive", for: "select", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_containers_update_org", { as: "permissive", for: "update", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
]);

export const transportVehicles = pgTable("transport_vehicles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recordId: uuid("record_id").notNull().references(() => transportRecords.id, { onDelete: "cascade" }),
	containerId: uuid("container_id").references(() => transportContainers.id, { onDelete: "set null" }),
	vin: varchar({ length: 17 }).notNull(),
	brand: varchar({ length: 100 }),
	model: varchar({ length: 100 }),
	year: integer(),
	color: varchar({ length: 50 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transport_vehicles_record_id_idx").using("btree", table.recordId.asc().nullsLast().op("uuid_ops")),
	index("transport_vehicles_container_id_idx").using("btree", table.containerId.asc().nullsLast().op("uuid_ops")),
	index("transport_vehicles_vin_idx").using("btree", table.vin.asc().nullsLast().op("text_ops")),
	pgPolicy("transport_vehicles_delete_org", { as: "permissive", for: "delete", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_vehicles_insert_org", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_vehicles_select_org", { as: "permissive", for: "select", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_vehicles_update_org", { as: "permissive", for: "update", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
]);

export const transportLegs = pgTable("transport_legs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recordId: uuid("record_id").notNull().references(() => transportRecords.id, { onDelete: "cascade" }),
	vesselName: varchar("vessel_name", { length: 200 }),
	imo: varchar({ length: 20 }),
	voyage: varchar({ length: 50 }),
	fromPortCode: varchar("from_port_code", { length: 20 }),
	fromPortName: varchar("from_port_name", { length: 200 }),
	toPortCode: varchar("to_port_code", { length: 20 }),
	toPortName: varchar("to_port_name", { length: 200 }),
	etd: date("etd"),
	eta: date("eta"),
	atd: timestamp("atd", { withTimezone: true }),
	ata: timestamp("ata", { withTimezone: true }),
	status: varchar({ length: 30 }).default('planned'),
	isCurrent: boolean("is_current").default(false).notNull(),
	sequence: integer().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transport_legs_record_id_idx").using("btree", table.recordId.asc().nullsLast().op("uuid_ops")),
	index("transport_legs_sequence_idx").using("btree", table.sequence.asc().nullsLast().op("int4_ops")),
	pgPolicy("transport_legs_delete_org", { as: "permissive", for: "delete", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_legs_insert_org", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_legs_select_org", { as: "permissive", for: "select", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
	pgPolicy("transport_legs_update_org", { as: "permissive", for: "update", to: ["public"], using: sql`(record_id IN (SELECT id FROM transport_records WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())))` }),
]);

export const transportNotifications = pgTable("transport_notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recordId: uuid("record_id").notNull().references(() => transportRecords.id, { onDelete: "cascade" }),
	organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
	type: varchar({ length: 30 }).notNull(),
	title: varchar({ length: 300 }).notNull(),
	content: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transport_notifications_record_id_idx").using("btree", table.recordId.asc().nullsLast().op("uuid_ops")),
	index("transport_notifications_org_id_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("transport_notifications_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	pgPolicy("transport_notifications_delete_org", { as: "permissive", for: "delete", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	pgPolicy("transport_notifications_insert_org", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_notifications_select_org", { as: "permissive", for: "select", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	pgPolicy("transport_notifications_update_org", { as: "permissive", for: "update", to: ["public"], using: sql`(organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()))` }),
	check("transport_notifications_type_check", sql`(type)::text = ANY ((ARRAY['normal_update'::character varying, 'important_change'::character varying, 'risk_warning'::character varying])::text[])`),
]);

export const transportNotificationReads = pgTable("transport_notification_reads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	notificationId: uuid("notification_id").notNull().references(() => transportNotifications.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("transport_notification_reads_unique").on(table.notificationId, table.userId),
	index("transport_notification_reads_notif_idx").using("btree", table.notificationId.asc().nullsLast().op("uuid_ops")),
	index("transport_notification_reads_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("transport_notification_reads_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("transport_notification_reads_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_notification_reads_select_own", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("transport_notification_reads_update_own", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = user_id)` }),
]);

export const transportManualOverrides = pgTable("transport_manual_overrides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recordId: uuid("record_id").notNull().references(() => transportRecords.id, { onDelete: "cascade" }),
	fieldName: varchar("field_name", { length: 100 }).notNull(),
	manualValue: text("manual_value"),
	autoValue: text("auto_value"),
	source: varchar({ length: 50 }),
	overriddenBy: uuid("overridden_by").notNull(),
	overriddenAt: timestamp("overridden_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("transport_manual_overrides_unique").on(table.recordId, table.fieldName),
	index("transport_manual_overrides_record_idx").using("btree", table.recordId.asc().nullsLast().op("uuid_ops")),
	pgPolicy("transport_manual_overrides_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = overridden_by)` }),
	pgPolicy("transport_manual_overrides_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("transport_manual_overrides_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("transport_manual_overrides_update_own", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = overridden_by)` }),
]);

// ─── 选车工作台 (Vehicle Sourcing Workbench) ───

export const sourcePlatforms = pgTable("source_platforms", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	url: varchar("url", { length: 500 }).notNull(),
	domain: varchar("domain", { length: 200 }).notNull(),
	icon: varchar("icon", { length: 500 }),
	type: varchar("type", { length: 20 }).default("default").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("source_platforms_org_domain").on(table.organizationId, table.domain),
	index("source_platforms_org_idx").on(table.organizationId),
]);

export const savedSearches = pgTable("saved_searches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	platformId: uuid("platform_id").notNull(),
	name: varchar("name", { length: 200 }).notNull(),
	url: varchar("url", { length: 1000 }).notNull(),
	visibility: varchar("visibility", { length: 20 }).default("private").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("saved_searches_org_idx").on(table.organizationId),
	index("saved_searches_platform_idx").on(table.platformId),
]);

export const candidateVehicles = pgTable("candidate_vehicles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	vin: varchar("vin", { length: 17 }),
	vinStatus: varchar("vin_status", { length: 20 }).default("missing").notNull(),
	brand: varchar("brand", { length: 100 }),
	series: varchar("series", { length: 100 }),
	model: varchar("model", { length: 200 }),
	year: integer("year"),
	mileage: integer("mileage"),
	location: varchar("location", { length: 200 }),
	color: varchar("color", { length: 50 }),
	listingPrice: doublePrecision("listing_price"),
	estimatedPurchasePrice: doublePrecision("estimated_purchase_price"),
	confirmedPurchasePrice: doublePrecision("confirmed_purchase_price"),
	totalStatus: varchar("total_status", { length: 20 }).default("pending_info").notNull(),
	responsiblePersonId: uuid("responsible_person_id"),
	notes: text("notes"),
	formalVehicleId: uuid("formal_vehicle_id"),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("candidate_vehicles_org_idx").on(table.organizationId),
	index("candidate_vehicles_vin_idx").on(table.vin),
	index("candidate_vehicles_status_idx").on(table.totalStatus),
	index("candidate_vehicles_responsible_idx").on(table.responsiblePersonId),
]);

export const vehicleSources = pgTable("vehicle_sources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	candidateVehicleId: uuid("candidate_vehicle_id").notNull(),
	platformId: uuid("platform_id"),
	platformName: varchar("platform_name", { length: 100 }).notNull(),
	url: varchar("url", { length: 1000 }).notNull(),
	title: varchar("title", { length: 500 }),
	brand: varchar("brand", { length: 100 }),
	series: varchar("series", { length: 100 }),
	model: varchar("model", { length: 200 }),
	year: integer("year"),
	mileage: integer("mileage"),
	location: varchar("location", { length: 200 }),
	listingPrice: doublePrecision("listing_price"),
	vin: varchar("vin", { length: 17 }),
	sellerInfo: text("seller_info"),
	imageUrls: jsonb("image_urls").default([]),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	sourceStatus: varchar("source_status", { length: 20 }).default("new_listing").notNull(),
	lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: 'string' }),
	checkMethod: varchar("check_method", { length: 20 }).default("manual").notNull(),
	isStale: boolean("is_stale").default(false),
	extractedAt: timestamp("extracted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by").notNull(),
}, (table) => [
	index("vehicle_sources_candidate_idx").on(table.candidateVehicleId),
	index("vehicle_sources_platform_idx").on(table.platformId),
	index("vehicle_sources_status_idx").on(table.sourceStatus),
]);

export const modelWatches = pgTable("model_watches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	brand: varchar("brand", { length: 100 }),
	series: varchar("series", { length: 100 }),
	model: varchar("model", { length: 200 }),
	yearMin: integer("year_min"),
	yearMax: integer("year_max"),
	priceMin: doublePrecision("price_min"),
	priceMax: doublePrecision("price_max"),
	mileageMin: integer("mileage_min"),
	mileageMax: integer("mileage_max"),
	location: varchar("location", { length: 200 }),
	watchStatus: varchar("watch_status", { length: 20 }).default("active").notNull(),
	sampleCount: integer("sample_count").default(0),
	medianPrice: doublePrecision("median_price"),
	priceRangeLow: doublePrecision("price_range_low"),
	priceRangeHigh: doublePrecision("price_range_high"),
	lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true, mode: 'string' }),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("model_watches_org_idx").on(table.organizationId),
	index("model_watches_status_idx").on(table.watchStatus),
]);

export const candidateVehicleCustomers = pgTable("candidate_vehicle_customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	candidateVehicleId: uuid("candidate_vehicle_id").notNull(),
	customerId: uuid("customer_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	hasQuotation: boolean("has_quotation").default(false),
	quotationAmount: doublePrecision("quotation_amount"),
	hasProformaInvoice: boolean("has_proforma_invoice").default(false),
	proformaInvoiceStatus: varchar("proforma_invoice_status", { length: 20 }),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("candidate_customer_unique").on(table.candidateVehicleId, table.customerId),
	index("candidate_customers_candidate_idx").on(table.candidateVehicleId),
	index("candidate_customers_customer_idx").on(table.customerId),
]);

export const candidateActivities = pgTable("candidate_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	candidateVehicleId: uuid("candidate_vehicle_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	actionType: varchar("action_type", { length: 50 }).notNull(),
	details: jsonb("details").default({}),
	performedBy: uuid("performed_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isCorrection: boolean("is_correction").default(false),
	correctsActivityId: uuid("corrects_activity_id"),
	correctionReason: text("correction_reason"),
}, (table) => [
	index("candidate_activities_candidate_idx").on(table.candidateVehicleId),
	index("candidate_activities_created_idx").on(table.createdAt),
]);

export const vehiclePriceHistory = pgTable("vehicle_price_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	vehicleSourceId: uuid("vehicle_source_id").notNull(),
	price: doublePrecision("price").notNull(),
	previousPrice: doublePrecision("previous_price"),
	changeType: varchar("change_type", { length: 20 }).notNull(),
	changeAmount: doublePrecision("change_amount"),
	changePercent: doublePrecision("change_percent"),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("vehicle_price_history_source_idx").on(table.vehicleSourceId),
	index("vehicle_price_history_recorded_idx").on(table.recordedAt),
]);

export const buyerProfiles = pgTable("buyer_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id"),
	buyerName: text("buyer_name").notNull(),
	buyerNameEn: text("buyer_name_en"),
	address: text("address"),
	addressEn: text("address_en"),
	country: text("country"),
	countryEn: text("country_en"),
	phone: text("phone"),
	email: text("email"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("buyer_profiles_user_idx").on(table.userId),
]);

// ─── 单证统一检索 ───

export const customsDeclarationFiles = pgTable("customs_declaration_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	entryNo: varchar("entry_no", { length: 200 }).notNull(),
	customsNo: varchar("customs_no", { length: 200 }),
	contractNo: varchar("contract_no", { length: 200 }),
	vins: text().array().default([] as string[]),
	fileKey: text("file_key").notNull(),
	fileName: varchar("file_name", { length: 500 }).notNull(),
	fileMime: varchar("file_mime", { length: 200 }).notNull(),
	fileSize: integer("file_size").default(0),
	issueDate: date("issue_date"),
	note: text("note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("cdf_entry_no_idx").on(table.entryNo),
	index("cdf_customs_no_idx").on(table.customsNo),
	index("cdf_contract_no_idx").on(table.contractNo),
	index("cdf_user_id_idx").on(table.userId),
	index("cdf_org_id_idx").on(table.organizationId),
	index("cdf_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("cdf_vins_gin_idx").using("gin", table.vins.asc().nullsLast().op("array_ops")),
	pgPolicy("cdf_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("cdf_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("cdf_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("cdf_update_own", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = user_id)` }),
]);

export const blDocuments = pgTable("bl_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").default(sql`auth.uid()`).notNull(),
	organizationId: uuid("organization_id"),
	blNo: varchar("bl_no", { length: 200 }).notNull(),
	vesselName: varchar("vessel_name", { length: 200 }),
	voyage: varchar("voyage", { length: 100 }),
	containerNumbers: text().array().default([] as string[]),
	vins: text().array().default([] as string[]),
	portOfLoading: varchar("port_of_loading", { length: 200 }),
	portOfDischarge: varchar("port_of_discharge", { length: 200 }),
	shippingDate: date("shipping_date"),
	estimatedArrivalDate: date("estimated_arrival_date"),
	carrier: varchar("carrier", { length: 200 }),
	fileKey: text("file_key").notNull(),
	fileName: varchar("file_name", { length: 500 }).notNull(),
	fileMime: varchar("file_mime", { length: 200 }).notNull(),
	fileSize: integer("file_size").default(0),
	note: text("note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("bld_bl_no_idx").on(table.blNo),
	index("bld_vessel_name_idx").on(table.vesselName),
	index("bld_user_id_idx").on(table.userId),
	index("bld_org_id_idx").on(table.organizationId),
	index("bld_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("bld_vins_gin_idx").using("gin", table.vins.asc().nullsLast().op("array_ops")),
	index("bld_containers_gin_idx").using("gin", table.containerNumbers.asc().nullsLast().op("array_ops")),
	pgPolicy("bld_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("bld_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("bld_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("bld_update_own", { as: "permissive", for: "update", to: ["public"], using: sql`(auth.uid() = user_id)` }),
]);
