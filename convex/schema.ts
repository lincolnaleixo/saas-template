import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    superRole: v.optional(v.literal("super_admin")),
    waitlistStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    waitlistRequestedAt: v.optional(v.number()),
    waitlistApprovedAt: v.optional(v.number()),
    waitlistApprovedBy: v.optional(v.id("users")),
  }).index("by_email", ["email"])
    .index("by_waitlist_status", ["waitlistStatus"]),

  accounts: defineTable({
    userId: v.id("users"),
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refresh_token: v.optional(v.string()),
    access_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_provider_and_provider_account_id", [
      "provider",
      "providerAccountId",
    ]),

  sessions: defineTable({
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(),
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_user_id", ["userId"]),

  verificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_token", ["token"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    planId: v.optional(v.string()),
    billingStatus: v.optional(
      v.union(
        v.literal("trialing"),
        v.literal("active"),
        v.literal("trial_expired"),
        v.literal("canceled")
      )
    ),
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    trialPlanId: v.optional(v.string()),
    trialEndedAt: v.optional(v.number()),
    subscriptionProvider: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionCustomerId: v.optional(v.string()),
    subscriptionPriceId: v.optional(v.string()),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    cancellationEffectiveAt: v.optional(v.number()),
  }).index("by_slug", ["slug"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    invitedBy: v.id("users"),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_organization_and_email", ["organizationId", "email"]),

  pagePermissions: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    page: v.union(
      v.literal("dashboard"),
      v.literal("analytics"),
      v.literal("reports"),
      v.literal("projects"),
      v.literal("team")
    ),
    canAccess: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_organization_and_user", ["organizationId", "userId"])
    .index("by_organization_user_and_page", ["organizationId", "userId", "page"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),
});
