import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate random token
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Create invitation
export const createInvitation = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const inviterRecord = await ctx.db.get(args.invitedBy);
    const inviterIsSuperAdmin = inviterRecord?.superRole === "super_admin";

    if (!inviterIsSuperAdmin) {
      const inviterMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", args.invitedBy)
        )
        .first();

      if (!inviterMembership || (inviterMembership.role !== "owner" && inviterMembership.role !== "admin")) {
        throw new Error("Only owners and admins can invite members");
      }
    }

    // Check if user already exists in organization
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMember = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", args.organizationId).eq("userId", existingUser._id)
        )
        .first();

      if (existingMember) {
        throw new Error("User is already a member of this organization");
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_organization_and_email", (q) =>
        q.eq("organizationId", args.organizationId).eq("email", args.email)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const invitationId = await ctx.db.insert("invitations", {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
      invitedBy: args.invitedBy,
      token,
      status: "pending",
      expiresAt,
      createdAt: Date.now(),
    });

    return { invitationId, token };
  },
});

// Get organization invitations
export const getOrganizationInvitations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get inviter details
    const invitationsWithInviters = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedBy);
        return {
          ...invitation,
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
        };
      })
    );

    return invitationsWithInviters;
  },
});

// Get invitation by token
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < Date.now()) {
      return { ...invitation, isExpired: true };
    }

    // Get organization details
    const organization = await ctx.db.get(invitation.organizationId);
    const inviter = await ctx.db.get(invitation.invitedBy);

    return {
      ...invitation,
      organizationName: organization?.name || "Unknown",
      inviterName: inviter?.name || "Unknown",
      isExpired: false,
    };
  },
});

// Get pending invitations for an email address
export const getPendingInvitationsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { token, userId }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    if (invitation.expiresAt < Date.now()) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", invitation.organizationId).eq("userId", userId)
      )
      .first();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await ctx.db.patch(invitation._id, { status: "accepted" });
      return { alreadyMember: true };
    }

    // Add user to organization
    await ctx.db.insert("organizationMembers", {
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      joinedAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return { alreadyMember: false, organizationId: invitation.organizationId };
  },
});

// Cancel invitation
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { invitationId, userId }) => {
    const invitation = await ctx.db.get(invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const actorRecord = await ctx.db.get(userId);
    const actorIsSuperAdmin = actorRecord?.superRole === "super_admin";

    if (!actorIsSuperAdmin) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", invitation.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new Error("Only owners and admins can manage invitations");
      }
    }

    await ctx.db.delete(invitationId);
  },
});

// Resend invitation (generates new token)
export const resendInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { invitationId, userId }) => {
    const invitation = await ctx.db.get(invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only resend pending invitations");
    }

    const actorRecord = await ctx.db.get(userId);
    const actorIsSuperAdmin = actorRecord?.superRole === "super_admin";

    if (!actorIsSuperAdmin) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization_and_user", (q) =>
          q.eq("organizationId", invitation.organizationId).eq("userId", userId)
        )
        .first();

      if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
        throw new Error("Only owners or admins can manage invitations");
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(invitationId, {
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    return { token };
  },
});
