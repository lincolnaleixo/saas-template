import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

async function deleteOrganizationInvitations(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const invitations = await ctx.db
    .query("invitations")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  await Promise.all(invitations.map((invitation) => ctx.db.delete(invitation._id)));
}

async function deleteOrganizationPagePermissions(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const permissions = await ctx.db
    .query("pagePermissions")
    .withIndex("by_organization_and_user", (q) => q.eq("organizationId", organizationId))
    .collect();

  await Promise.all(permissions.map((permission) => ctx.db.delete(permission._id)));
}

export async function deleteOrganizationCascade(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  await deleteOrganizationInvitations(ctx, organizationId);
  await deleteOrganizationPagePermissions(ctx, organizationId);
  await ctx.db.delete(organizationId);
}

export async function deleteOrganizationIfEmpty(
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) {
  const remainingMember = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

  if (remainingMember) {
    return false;
  }

  await deleteOrganizationCascade(ctx, organizationId);
  return true;
}
