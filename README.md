# Multi-Tenant SaaS Template

A production-ready SaaS starter template with authentication, multi-tenancy, and a beautiful UI.

## Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Authentication**: [NextAuth.js v5](https://next-auth.js.org/) with Google OAuth
- **Database**: [Convex](https://convex.dev/) - real-time database
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

## Features

✅ **Google OAuth Authentication** - Secure sign-in with Google
✅ **Multi-tenant Architecture** - Organizations with role-based access (owner, admin, member)
✅ **Real-time Database** - Powered by Convex
✅ **Beautiful UI** - Pre-built components with shadcn/ui
✅ **Type Safety** - Full TypeScript support
✅ **Zero Third-Party Auth Costs** - Self-hosted authentication with NextAuth.js
✅ **Support Console** - Super admins can audit workspaces, delete orgs/users, and delegate access
✅ **Plan-aware Access** - Workspace plans (Free/Pro + trial) toggle pages automatically
✅ **Waitlist Feature** - Optional waitlist mode for private beta launches with manual approval

## Quick Start

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd saas-template
   npm install
   ```

2. **Copy the environment template**

   ```bash
   cp .env.example .env.local
   ```

   When deploying to Vercel, the app automatically falls back to the runtime
   domain exposed in `VERCEL_URL`, so you can keep `NEXTAUTH_URL` empty in
   production. Set `NEXT_PUBLIC_APP_URL` if you need invitation emails or
   Stripe redirects to use a custom hostname.

3. **Generate a NextAuth secret**

   ```bash
   openssl rand -base64 32
   ```

   Paste the value into `AUTH_SECRET` inside `.env.local`.

4. **Configure Google OAuth**

   1. Open the [Google Cloud Console](https://console.cloud.google.com/).
   2. Create or select a project → **APIs & Services → Credentials**.
   3. Configure the OAuth consent screen if prompted (add `email`, `profile`, `openid`).
   4. Create an **OAuth client ID**:
      - Application type: Web Application.
      - Redirect URI: `http://localhost:3000/api/auth/callback/google`.
   5. Copy the Client ID and Client Secret into `.env.local`.

5. **Provision Convex**

   ```bash
   npx convex dev
   ```

   Follow the prompts. Your `.env.local` will include `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` when complete.

6. **(Optional) Configure email sending**

   - Create a [Resend](https://resend.com/) API key if you plan to email invitations.
   - Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local`. For local development you can leave the defaults.

7. **Install & authenticate the Stripe CLI**

   ```bash
   brew install stripe # or follow https://stripe.com/docs/stripe-cli
   stripe login
   ```

   The dev script launches the Stripe listener automatically; without the CLI the process exits early.

8. **Run the app**

   ```bash
   npm run dev
   ```

   This starts Next.js, Convex, and the Stripe listener in parallel. Sign in at [http://localhost:3000/login](http://localhost:3000/login) using Google.

9. **Understand the first-user flow**

   - When a brand-new user signs in (and has no pending invite) the app automatically provisions a personal organization for them.

## Architecture

### Multi-Tenancy

The template implements a complete multi-tenant architecture:

- **Organizations**: Each tenant is an organization with a unique slug
- **Roles**: Three levels of access - `owner`, `admin`, `member`
- **Organization Switching**: Users can belong to multiple organizations
- **Context Provider**: `OrganizationProvider` manages current organization state

### Database Schema

```typescript
// Users - stores user profiles from OAuth
users: {
  email: string
  name?: string
  image?: string
  emailVerified?: Date
  superRole?: "super_admin"
}

// Organizations - multi-tenant workspaces
organizations: {
  name: string
  slug: string
  createdBy: userId
  createdAt: Date
  planId?: "free" | "pro"
  billingStatus?: "trialing" | "active" | "trial_expired" | "canceled"
  trialStartedAt?: Date
  trialEndsAt?: Date
}

// OrganizationMembers - links users to organizations
organizationMembers: {
  organizationId: Id<"organizations">
  userId: Id<"users">
  role: "owner" | "admin" | "member"
  joinedAt: Date
}
```

### Authentication Flow

1. User visits `/login` page with shadcn login form
2. User clicks "Continue with Google"
3. NextAuth.js handles OAuth flow with Google
4. User data stored in Convex via custom adapter
5. **Auto-organization creation**: First-time users get a default organization
6. Session created with user ID
7. User redirected to home `/`
8. Frontend receives session via `useSession()` hook
9. Organization context loads user's organizations
10. User can switch between organizations using dropdown

### File Structure

```
├── app/
│   ├── api/auth/[...nextauth]/   # NextAuth.js API routes
│   ├── login/                    # Login page with shadcn form
│   ├── dashboard/                # Protected dashboard
│   └── layout.tsx                # Root layout with providers
├── components/
│   ├── providers.tsx             # Combined providers wrapper
│   ├── login-form.tsx            # Google OAuth login form
│   ├── organization-switcher.tsx # Org switching dropdown
│   ├── user-menu.tsx             # User avatar + logout menu
│   ├── site-header.tsx           # Dashboard header with org switcher
│   └── ui/                       # shadcn/ui components
├── contexts/
│   └── organization-context.tsx  # Multi-tenant context
├── convex/
│   ├── schema.ts                 # Convex database schema
│   └── auth.ts                   # Auth queries/mutations
├── lib/
│   ├── auth.ts                   # NextAuth config + auto-org creation
│   └── auth-adapter.ts           # Custom Convex adapter
├── types/
│   └── next-auth.d.ts            # NextAuth type extensions
└── middleware.ts                 # Auth middleware for protected routes
```

## Usage Examples

## Super Admin Setup (optional but recommended)

Super admins unlock a `/admin` console where they can troubleshoot any workspace, view tenants, and grant the same access to other teammates.
From there you can also delete organizations (and any members who no longer belong anywhere) or delete individual user accounts.

1. **Generate a Convex deploy key**

   - Open the Convex dashboard → select your deployment → **Settings → URL & Deploy Key**.
   - Click **Generate Development Deploy Key**, give it a descriptive name (e.g. `local-super-admin`), and hit **Save**.
   - Copy the token that appears (Convex only shows it once!) and add it to `.env.local`:

     ```env
     CONVEX_ADMIN_KEY=your-generated-deploy-key
     ```

   Keep this value private—treat it like any other secret.

2. **Promote a user**

   ```bash
   npm run superadmin:grant -- --email=user@example.com
   ```

   Append `--remove` to revoke the role.

   The script automatically loads environment variables from `.env.local` (and `.env` as a fallback), so make sure the file includes both `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_ADMIN_KEY` when working against your development deployment.

   To target another environment (for example production), pull that environment’s variables and pass a flag:

   ```bash
   vercel env pull .env.production.local
   npm run superadmin:grant -- --prod --email=user@example.com
   ```

   Available flags:

   - `--prod` / `-prod` → loads `.env.production.local` → `.env.production`
   - `--dev` / `-dev` → loads `.env.development.local` → `.env.development`
   - `--env=<name>` → loads `.env.<name>.local` → `.env.<name>`

   The script falls back to `.env.local`/`.env` after loading the requested files, so shared values (like API keys) can still live in the defaults.

3. **Sign in as the promoted account**

   - After a normal Google login the sidebar shows an **Admin** entry that links to the global console.

4. **(Optional) Delegate additional access**

   - Use the Users table in `/admin` to grant or revoke super admin for other addresses.

Everything in the admin console still runs through server-side checks, but treat it as a break-glass tool for support staff.

## Waitlist Feature

The template includes a built-in waitlist system perfect for private beta launches or controlled rollouts.

### How It Works

When **waitlist mode is enabled**:
1. New users who sign in with Google are automatically added to the waitlist with "pending" status
2. They see a beautiful waitlist page explaining they're in the queue
3. Super admins review and approve/reject users from the `/admin` console
4. Once approved, users can access the full application
5. An organization is automatically created for approved users

When **waitlist mode is disabled**:
- New users get immediate access (default behavior)
- Existing waitlist users keep their status
- The login page returns to standard messaging

### Enabling the Waitlist

1. **Sign in as a super admin** (see Super Admin Setup section above)
2. Navigate to `/admin` in your browser
3. Locate the **Waitlist Settings** card at the top
4. Click **Enable Waitlist**
5. Confirm the action

The login page will immediately update to show "Join the Waitlist" messaging, and new sign-ups will require approval.

### Managing Waitlist Users

From the `/admin` console, super admins can:
- View all pending waitlist users with their request dates
- See waitlist statistics (pending, approved, rejected counts)
- **Approve** users - creates their organization and grants access
- **Reject** users - prevents access to the platform
- **Disable** the waitlist at any time to open registration

### User Experience

**When waitlist is enabled:**
- Login page shows "Join the Waitlist" with private beta messaging
- After signing in, users see a dedicated `/waitlist` page with:
  - Status indicator (pending/rejected)
  - Clear explanation of what happens next
  - Email notification promise
  - Sign out option

**When a user is approved:**
- They can access the full application on next login
- A default organization is automatically created for them
- They're redirected to the normal dashboard

**When a user is rejected:**
- They see a message that access is not available
- They cannot access any protected routes

### Database Schema

The waitlist feature extends the `users` table with:

```typescript
users: {
  // ... existing fields ...
  waitlistStatus?: "pending" | "approved" | "rejected"
  waitlistRequestedAt?: number
  waitlistApprovedAt?: number
  waitlistApprovedBy?: Id<"users">
}
```

### Use Cases

- **Private Beta Launch**: Enable waitlist when first launching to manually vet early users
- **Controlled Growth**: Manage server load by approving users in batches
- **Quality Control**: Review user emails/names before granting access
- **Exclusive Access**: Create anticipation with a waitlist before public launch

### Disabling the Waitlist

To open registration to everyone:
1. Go to `/admin` as a super admin
2. Click **Disable Waitlist** in the Waitlist Settings card
3. Confirm the action

New users will immediately get access without approval. Existing approved/rejected users keep their status.

## Plans, Billing & Trials

- New workspaces start on the **Starter (Free)** plan. Owners and admins can opt into a paid tier (and any available trial) from the **Billing** page when they’re ready.
- Owners and admins can open the **Billing** page (sidebar → Billing) to compare plans, view the remaining trial time, and switch plans instantly.
- Plan features are enforced throughout the app: if a plan doesn’t include a page (for example, Analytics on the free tier), the navigation entry disappears and permission guards explain that an upgrade is needed.
- User-level permissions still layer on top of plan access. Members only see what both their role and the plan allow.

### Stripe Integration

1. **Install & authenticate the Stripe CLI**
   ```bash
   brew install stripe # or follow https://stripe.com/docs/stripe-cli
   stripe login
   ```

2. **Set up plan metadata in the codebase first**
   - Pricing tiers live in `lib/subscription-plans.ts`. Update the amounts, trial length, feature flags, or add/remove plans there before you touch Stripe.
   - Convex automatically seeds new organizations with the default plan defined in that file; no additional Convex-side setup is required once you edit it.

3. **Fetch API keys (the manual step)**
   - Visit [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) while in test mode.
   - Copy the **Publishable key** into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and click **Reveal test key token** to copy the secret into `STRIPE_SECRET_KEY`.
   - For production, grab the live keys from [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).

4. **Create Stripe products/prices via automation (recommended)**
   - With the secret key already in `.env.local`, run:

     ```bash
     npm run setup:stripe
     ```

   - The script reads the plan definitions, creates (or reuses) matching Stripe products/prices, and writes their Price IDs to `NEXT_PUBLIC_STRIPE_PRICE_*` in `.env.local`.
   - Prefer doing it by hand? See the script for the legacy `stripe ... -d metadata[planId]=...` commands that work on every CLI version.

5. **Configure webhooks with the CLI (this yields `STRIPE_WEBHOOK_SECRET`)**

   ```bash
   npm run stripe:listen
   ```

   - The helper script reads `STRIPE_SECRET_KEY` from `.env.local`, verifies the Stripe CLI is installed, and runs:

   ```bash
   stripe listen \
     --events customer.subscription.created \
     --events customer.subscription.updated \
     --events customer.subscription.deleted \
     --forward-to localhost:3000/api/webhooks/stripe
   ```

   - The command prints a signing secret (`whsec_...`) and the script automatically writes it to `.env.local` as `STRIPE_WEBHOOK_SECRET`. Re-run it any time to mint a fresh secret during development.
   - For production, register a persistent endpoint so the secret doesn’t change on every run:

     ```bash
     stripe webhook-endpoints create \
       --url https://yourdomain.com/api/webhooks/stripe \
       --enabled-events customer.subscription.created \
       --enabled-events customer.subscription.updated \
       --enabled-events customer.subscription.deleted
     ```

     The response includes the production signing secret (`whsec_...`); store that in your hosting environment.

6. **Update local env & test**
   - Ensure `.env.local` now contains `CONVEX_ADMIN_KEY`, both Stripe keys, and the generated price IDs, then restart `npm run dev`.
   - The `dev` script now launches Next.js, Convex, and `stripe:listen` in parallel. Make sure the Stripe CLI is installed/authenticated before running it—otherwise the process fails and your webhooks won’t flow during local testing.
   - Automatic tax is disabled by default. Set `STRIPE_AUTOMATIC_TAX_ENABLED=true` only after configuring your Stripe Tax origin address (per [Stripe’s docs](https://stripe.com/docs/tax)). Without it, Stripe rejects Checkout sessions with a 400 response.
   - Visit the Billing page. Upgrades launch Stripe Checkout; existing paid orgs show “Manage billing,” which opens the Stripe Billing Portal.
   - Use Stripe test cards such as `4242 4242 4242 4242` (any future expiry, any CVC) to validate the flow while the `stripe listen` command keeps webhooks flowing to your app.

> `npm run dev` keeps the Stripe CLI listener active during development. If you want to run it manually, use `npm run stripe:listen`. Stop the listener once you configure a hosted webhook endpoint in production.

### Protecting Routes

```typescript
// app/(app)/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return <div>Protected content</div>;
}
```

### Using Organization Context

```typescript
"use client";
import { useOrganization } from "@/contexts/organization-context";

export function MyComponent() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();

  return (
    <div>
      <h1>Current Org: {currentOrganization?.name}</h1>
      {/* Organization switcher UI */}
    </div>
  );
}
```

### Sign Out / Logout

```typescript
"use client";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  const handleLogout = () => {
    // Clear organization context
    localStorage.removeItem("currentOrganizationId");
    // Sign out and redirect to login
    signOut({ callbackUrl: "/login" });
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
```

The UserMenu component in the dashboard already includes this logout functionality.

### Querying Convex with Multi-Tenancy

```typescript
// convex/tasks.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getTasks = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});
```

## Production Deployment

### Automated Deployment (Recommended)

The fastest way to deploy to production is using our automated deployment script. This script handles all the complex setup automatically.

#### Prerequisites

Before running the deployment script, ensure you have:

1. **Vercel CLI installed and authenticated**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **A working `.env.local` file** with all required variables from development:
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_CONVEX_URL`
   - (Optional) Stripe variables if using billing
   - (Optional) Resend variables if using email invitations

3. **Convex CLI** (automatically installed with `npm install`)

4. **Google OAuth credentials** configured for localhost (from Quick Start)

#### Run the Deployment Script

```bash
npm run deploy:prod
```

This single command will:
1. ✅ Check all prerequisites
2. ✅ Deploy Convex functions to production
3. ✅ Link your Vercel project
4. ✅ Set all environment variables in Vercel (from `.env.local`)
5. ✅ Deploy your application to Vercel
6. ✅ Provide post-deployment instructions

#### After the Script Completes

You only need to do **one manual step**:

**Add the production OAuth redirect URI to Google Cloud Console:**

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth client and add:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
3. Wait 5-10 minutes for Google to propagate changes
4. Test your production deployment!

**Optional:** If using Stripe, set up the production webhook endpoint (script provides exact instructions).

---

### Manual Deployment (Alternative)

If you prefer to deploy manually or need more control, follow these detailed steps:

#### Prerequisites Checklist

Before deploying, ensure you have:
- ✅ A GitHub repository with your code
- ✅ A Vercel account (or your preferred hosting platform)
- ✅ A Convex account with your development deployment working
- ✅ Google OAuth credentials configured for localhost

### Step 1: Deploy Convex Functions to Production

**Critical:** Your local development uses a dev Convex deployment (`dev:your-deployment-name`). Production needs its own deployment.

```bash
# Deploy Convex functions to production
npx convex deploy --yes
```

This command will:
- Create a production Convex deployment (if not already created)
- Deploy all your database schema and functions
- Output a production URL like `https://your-deployment-name.convex.cloud`

**Save this production URL** - you'll need it for the next steps.

### Step 2: Configure Google OAuth for Production

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth client ID (the one you created for development)
3. Add your production redirect URI to **Authorized redirect URIs**:
   ```
   https://your-production-domain.vercel.app/api/auth/callback/google
   ```
   **Important:** The URI must include the full path `/api/auth/callback/google`, not just the domain!

4. Click **Save**
5. Wait 5-10 minutes for Google to propagate the changes

### Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add the following variables for the **Production** environment:

| Variable | Value | Notes |
|----------|-------|-------|
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` | **Must be set** - Different from dev for security |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Same as development |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret | Same as development |
| `NEXT_PUBLIC_CONVEX_URL` | `https://your-prod-deployment.convex.cloud` | **Use production URL from Step 1** |

**Optional but recommended:**
| Variable | Value | Notes |
|----------|-------|-------|
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Only needed for custom domains |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | For invitation emails |
| `RESEND_API_KEY` | Your Resend API key | For email invitations |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Verified domain in Resend |
| `STRIPE_SECRET_KEY` | Your Stripe secret key | For billing features |
| `STRIPE_WEBHOOK_SECRET` | Your production webhook secret | See Stripe section |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key | For checkout |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Stripe Price ID | From Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PRICE_ULTRA` | Stripe Price ID | From Stripe dashboard |

### Step 4: Deploy to Vercel

```bash
# Push to GitHub (triggers automatic Vercel deployment)
git push origin main
```

Or manually deploy:
```bash
vercel --prod
```

### Step 5: Set Up Production Stripe Webhooks (Optional)

If using Stripe for billing:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the endpoint URL to:
   ```
   https://your-domain.vercel.app/api/webhooks/stripe
   ```
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### Step 6: Verify Production Deployment

After deployment completes:

1. Visit your production URL: `https://your-domain.vercel.app`
2. Click the login button
3. Sign in with Google
4. Verify you're redirected back successfully
5. Check that your organization is created

### Common Production Issues & Solutions

#### Issue: "Uncaught SyntaxError: Unexpected token '<'"
**Cause:** Middleware is blocking static assets
**Solution:** Already fixed in this template - middleware explicitly allows `_next/*` paths

#### Issue: "Error 400: redirect_uri_mismatch"
**Cause:** Google OAuth redirect URI not configured correctly
**Solution:**
- Verify the redirect URI in Google Cloud Console is **exactly**: `https://your-domain.vercel.app/api/auth/callback/google`
- Wait 5-10 minutes for changes to propagate
- Clear browser cache or use incognito mode

#### Issue: "Configuration error" or 500 error after OAuth callback
**Cause:** Missing environment variables or using dev Convex deployment
**Solution:**
- Verify `NEXT_PUBLIC_CONVEX_URL` points to production deployment (from Step 1)
- Verify `AUTH_SECRET` is set in Vercel
- Check Vercel deployment logs for specific error messages

#### Issue: "Failed to fetch" or database connection errors
**Cause:** Using development Convex URL in production
**Solution:**
- Run `npx convex deploy` to create production deployment
- Update `NEXT_PUBLIC_CONVEX_URL` in Vercel to production URL
- Redeploy

### Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| Convex Deployment | `dev:your-name-123` | `https://your-name-123.convex.cloud` |
| OAuth Redirect | `http://localhost:3000/api/auth/callback/google` | `https://your-domain.vercel.app/api/auth/callback/google` |
| AUTH_SECRET | Can reuse | Should be unique |
| Stripe Webhooks | CLI with `stripe listen` | Persistent endpoint |
| Environment Variables | `.env.local` file | Vercel dashboard |

### Monitoring Production

- **Vercel Logs**: Check deployment and runtime logs in Vercel dashboard
- **Convex Logs**: Monitor function execution in Convex dashboard
- **Error Tracking**: Consider adding Sentry or similar for production errors

### Custom Domains

If using a custom domain:

1. Add domain in Vercel → Settings → Domains
2. Update Google OAuth redirect URIs to use custom domain
3. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to custom domain
4. Update Stripe webhook endpoint URL
5. Redeploy

## Performance Optimizations

### Client-Side Router Cache

The template is configured with aggressive client-side caching for instant back/forward navigation:

- **Route Cache Duration**: Pages stay cached for 5 minutes (both static and dynamic)
- **Prefetching**: Navigation links automatically prefetch on hover for instant navigation
- **Configuration**: Set in `next.config.ts` via `experimental.staleTimes`

This means when users navigate between pages, they'll get near-instant rendering when going back to previously visited pages, without needing to re-fetch data or re-render components from scratch.

**How it works:**
1. When you hover over a navigation link, Next.js prefetches that page in the background
2. When you click the link, the page loads instantly from the prefetched cache
3. When you navigate back/forward, pages render from the 5-minute cache instead of re-fetching

**To adjust cache duration:**
Edit `next.config.ts` and change the `staleTimes` values (in seconds):
```typescript
experimental: {
  staleTimes: {
    dynamic: 300,  // 5 minutes (change to your preference)
    static: 300,   // 5 minutes
  },
}
```

## Customization

### Adding More OAuth Providers

Edit `lib/auth.ts`:

```typescript
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({ /* ... */ }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
});
```

### Extending User Model

1. Update `convex/schema.ts` to add fields
2. Update `lib/auth-adapter.ts` to handle new fields
3. Update `types/next-auth.d.ts` for TypeScript types

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
