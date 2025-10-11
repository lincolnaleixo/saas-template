import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { sendInvitationEmail } from "@/lib/email";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveRequestBaseUrl } from "@/lib/env";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      organizationId?: string;
      email?: string;
      role?: "admin" | "member";
      organizationName?: string;
    };
    const { organizationId, email, role, organizationName } = body;

    if (!organizationId || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create invitation in Convex
    const { token } = await convex.mutation(api.invitations.createInvitation, {
      organizationId: organizationId as Id<"organizations">,
      email,
      role,
      invitedBy: session.user.id as Id<"users">,
    });

    // Generate invite URL
    const baseUrl = resolveRequestBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send email
    await sendInvitationEmail({
      to: email,
      organizationName: organizationName ?? "your organization",
      inviterName: session.user.name || "Someone",
      inviteUrl,
      role,
    });

    return NextResponse.json({
      success: true,
      inviteUrl,
    });
  } catch (error: unknown) {
    console.error("Failed to send invitation:", error);
    const message = error instanceof Error ? error.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
