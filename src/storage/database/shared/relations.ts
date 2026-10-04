import { relations } from "drizzle-orm/relations";
import { usersInAuth, exportDeclarations, organizations, organizationInvitations, organizationRoles, customers, proformaInvoices, savedDocuments, companyProfiles, bankAccounts, complianceDeclarations, bookmarks, userSavedUrls, exportLicenses, documentDrafts, organizationMembers, contractDocuments, customsDeclarations, vehicleArchives } from "./schema";

export const exportDeclarationsRelations = relations(exportDeclarations, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [exportDeclarations.userId],
		references: [usersInAuth.id]
	}),
	organization: one(organizations, {
		fields: [exportDeclarations.organizationId],
		references: [organizations.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	exportDeclarations: many(exportDeclarations),
	companyProfiles: many(companyProfiles),
	bankAccounts: many(bankAccounts),
	userSavedUrls: many(userSavedUrls),
	documentDrafts: many(documentDrafts),
	vehicleArchives: many(vehicleArchives),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	exportDeclarations: many(exportDeclarations),
	organizationInvitations: many(organizationInvitations),
	proformaInvoices: many(proformaInvoices),
	savedDocuments: many(savedDocuments),
	companyProfiles: many(companyProfiles),
	bankAccounts: many(bankAccounts),
	complianceDeclarations: many(complianceDeclarations),
	bookmarks: many(bookmarks),
	userSavedUrls: many(userSavedUrls),
	customers: many(customers),
	exportLicenses: many(exportLicenses),
	documentDrafts: many(documentDrafts),
	organizationRoles: many(organizationRoles),
	organizationMembers: many(organizationMembers),
	contractDocuments: many(contractDocuments),
	customsDeclarations: many(customsDeclarations),
	vehicleArchives: many(vehicleArchives),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationInvitations.organizationId],
		references: [organizations.id]
	}),
	organizationRole: one(organizationRoles, {
		fields: [organizationInvitations.roleId],
		references: [organizationRoles.id]
	}),
}));

export const organizationRolesRelations = relations(organizationRoles, ({one, many}) => ({
	organizationInvitations: many(organizationInvitations),
	organization: one(organizations, {
		fields: [organizationRoles.organizationId],
		references: [organizations.id]
	}),
	organizationMembers: many(organizationMembers),
}));

export const proformaInvoicesRelations = relations(proformaInvoices, ({one}) => ({
	customer: one(customers, {
		fields: [proformaInvoices.customerId],
		references: [customers.id]
	}),
	organization: one(organizations, {
		fields: [proformaInvoices.organizationId],
		references: [organizations.id]
	}),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	proformaInvoices: many(proformaInvoices),
	organization: one(organizations, {
		fields: [customers.organizationId],
		references: [organizations.id]
	}),
}));

export const savedDocumentsRelations = relations(savedDocuments, ({one}) => ({
	organization: one(organizations, {
		fields: [savedDocuments.organizationId],
		references: [organizations.id]
	}),
}));

export const companyProfilesRelations = relations(companyProfiles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [companyProfiles.userId],
		references: [usersInAuth.id]
	}),
	organization: one(organizations, {
		fields: [companyProfiles.organizationId],
		references: [organizations.id]
	}),
}));

export const bankAccountsRelations = relations(bankAccounts, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [bankAccounts.userId],
		references: [usersInAuth.id]
	}),
	organization: one(organizations, {
		fields: [bankAccounts.organizationId],
		references: [organizations.id]
	}),
}));

export const complianceDeclarationsRelations = relations(complianceDeclarations, ({one}) => ({
	organization: one(organizations, {
		fields: [complianceDeclarations.organizationId],
		references: [organizations.id]
	}),
}));

export const bookmarksRelations = relations(bookmarks, ({one}) => ({
	organization: one(organizations, {
		fields: [bookmarks.organizationId],
		references: [organizations.id]
	}),
}));

export const userSavedUrlsRelations = relations(userSavedUrls, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userSavedUrls.userId],
		references: [usersInAuth.id]
	}),
	organization: one(organizations, {
		fields: [userSavedUrls.organizationId],
		references: [organizations.id]
	}),
}));

export const exportLicensesRelations = relations(exportLicenses, ({one}) => ({
	organization: one(organizations, {
		fields: [exportLicenses.organizationId],
		references: [organizations.id]
	}),
}));

export const documentDraftsRelations = relations(documentDrafts, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [documentDrafts.userId],
		references: [usersInAuth.id]
	}),
	organization: one(organizations, {
		fields: [documentDrafts.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationMembersRelations = relations(organizationMembers, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMembers.organizationId],
		references: [organizations.id]
	}),
	organizationRole: one(organizationRoles, {
		fields: [organizationMembers.roleId],
		references: [organizationRoles.id]
	}),
}));

export const contractDocumentsRelations = relations(contractDocuments, ({one}) => ({
	organization: one(organizations, {
		fields: [contractDocuments.organizationId],
		references: [organizations.id]
	}),
}));

export const customsDeclarationsRelations = relations(customsDeclarations, ({one}) => ({
	organization: one(organizations, {
		fields: [customsDeclarations.organizationId],
		references: [organizations.id]
	}),
}));

export const vehicleArchivesRelations = relations(vehicleArchives, ({one}) => ({
	organization: one(organizations, {
		fields: [vehicleArchives.organizationId],
		references: [organizations.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [vehicleArchives.userId],
		references: [usersInAuth.id]
	}),
}));