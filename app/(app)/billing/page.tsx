"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useOrganization } from "@/contexts/organization-context";
import { useSubscription } from "@/hooks/use-subscription";
import { subscriptionPlans, planOrder, getPlan } from "@/lib/subscription-plans";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { PlanId } from "@/lib/subscription-plans";
import type { Id } from "@/convex/_generated/dataModel";

function formatTrialCountdown(ms: number) {
  if (ms <= 0) {
    return "Trial ended";
  }
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) {
    const hours = Math.ceil(ms / (60 * 60 * 1000));
    return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
  }
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentOrganization } = useOrganization();
  const { subscription, isLoading } = useSubscription();
  const downgradePlan = useMutation(api.subscriptions.downgradeToFree);
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.superRole === "super_admin";
  const currentRole = currentOrganization?.role;
  const canManage = isSuperAdmin || currentRole === "owner" || currentRole === "admin";

  // Consider loading if session is loading OR if organization context is still loading
  const { isLoading: orgLoading } = useOrganization();
  const isSessionLoading = status === "loading" || orgLoading;

  const currentPlanId: PlanId | undefined = subscription?.planId ?? undefined;
  const plans = useMemo(() => planOrder.map((id) => subscriptionPlans[id]), []);

  const hasActiveTrial = subscription?.billingStatus === "trialing";
  const hasUsedTrial = Boolean(subscription?.trialEndedAt);
  const showTrialAvailabilityCopy = !hasActiveTrial || hasUsedTrial;

  const trialMessage = useMemo(() => {
    if (!subscription) return null;
    if (subscription.billingStatus === "trialing") {
      return formatTrialCountdown(subscription.trialRemainingMs);
    }
    if (subscription.billingStatus === "trial_expired") {
      return "Trial ended";
    }
    return null;
  }, [subscription]);

  const cancellationMessage = useMemo(() => {
    if (!subscription?.cancellationEffectiveAt) {
      return null;
    }
    if (subscription.cancellationEffectiveAt <= Date.now()) {
      return null;
    }
    return `Plan scheduled to end on ${formatDate(subscription.cancellationEffectiveAt)}.`;
  }, [subscription?.cancellationEffectiveAt]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!currentOrganization?._id || !session?.user?.id) {
      toast.error("No organization selected");
      return;
    }

    const organizationId = currentOrganization._id;
    const userId = session.user.id as Id<"users">;

    if (planId === "free") {
      setPendingPlanId(planId);
      try {
        await downgradePlan({ organizationId, userId });
        toast.success(`Plan updated to ${getPlan(planId).name}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update plan");
      } finally {
        setPendingPlanId(null);
      }
      return;
    }

    setPendingPlanId(planId);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId, planId }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload?.url) {
        toast.error(payload?.error ?? "Failed to start checkout");
        setPendingPlanId(null);
        return;
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setPendingPlanId(null);
    }
  };

  const handleManageBilling = async () => {
    if (!currentOrganization?._id) {
      toast.error("No organization selected");
      return;
    }

    setIsPortalLoading(true);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrganization._id }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload?.url) {
        toast.error(payload?.error ?? "Failed to open billing portal");
        return;
      }

      window.location.href = payload.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  };

  useEffect(() => {
    if (!currentOrganization?._id || !canManage) {
      setInvoices([]);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setInvoiceLoading(true);
      setInvoiceError(null);
      try {
        const response = await fetch(
          `/api/billing/invoices?organizationId=${currentOrganization._id}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        const payload = (await response.json()) as {
          invoices?: InvoiceSummary[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load invoices");
        }

        setInvoices(payload.invoices ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setInvoiceError(error instanceof Error ? error.message : "Failed to load invoices");
      } finally {
        if (!controller.signal.aborted) {
          setInvoiceLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [currentOrganization?._id, canManage]);

  useEffect(() => {
    // Only redirect if we're sure the user doesn't have permission
    // Don't redirect while still loading organization context
    if (isSessionLoading) {
      return;
    }

    if (status === "authenticated" && currentOrganization && !canManage) {
      router.replace("/");
    }
  }, [canManage, isSessionLoading, router, status, currentOrganization]);

  // Show loading state while session or organization context is loading
  if (isSessionLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If fully loaded and user doesn't have permission, show loading while redirecting
  if (status === "authenticated" && currentOrganization && !canManage) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 md:px-6 lg:px-8 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Billing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {!isLoading &&
            canManage &&
            subscription?.subscriptionProvider === "stripe" &&
            subscription.subscriptionCustomerId && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening portal...
                    </span>
                  ) : (
                    "Manage billing"
                  )}
                </Button>
              </div>
            )}
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-6 lg:px-8">
        <div className="w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground">
            Choose the plan that fits your team. Downgrade or upgrade at any time.
          </p>
          {showTrialAvailabilityCopy && canManage && (
            <p className="text-sm text-muted-foreground">
              Paid plans include a 14-day free trial, available once per workspace.
            </p>
          )}
          {!isLoading && subscription && trialMessage && (
            <p className="text-sm text-muted-foreground">{trialMessage}</p>
          )}
          {!isLoading && subscription && cancellationMessage && (
            <p className="text-sm text-muted-foreground">{cancellationMessage}</p>
          )}
        </div>



        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isTrialingPro =
              subscription?.billingStatus === "trialing" && subscription.planId === plan.id;
            const isPending = pendingPlanId === plan.id;
            const disabled =
              !canManage || isCurrent || (pendingPlanId !== null && pendingPlanId !== plan.id);

            let trialDetail: string | null = null;
            if (plan.trialDays && showTrialAvailabilityCopy && canManage) {
              trialDetail = hasUsedTrial
                ? "Trial already used"
                : `${plan.trialDays}-day free trial (one per workspace)`;
            }

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between ${
                  plan.highlight || isCurrent ? "border-primary" : ""
                }`}
                aria-disabled={!canManage}
              >
                <CardHeader className="space-y-3">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="min-h-[2.5rem]">{plan.description}</CardDescription>
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/{plan.priceInterval}</span>
                  </div>
                  {trialDetail && (
                    <p className="text-xs text-muted-foreground">{trialDetail}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {Object.entries(plan.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check
                          className={`h-4 w-4 ${enabled ? "text-emerald-500" : "text-muted-foreground"}`}
                        />
                        <span className={!enabled ? "text-muted-foreground" : ""}>
                          {feature.charAt(0).toUpperCase() + feature.slice(1)}
                          {!enabled && " (unavailable)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : isCurrent ? "secondary" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={disabled}
                  >
                    {isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {plan.id === "free" ? "Switching..." : "Redirecting..."}
                      </span>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isTrialingPro && plan.id === "pro" ? (
                      "Trial in progress"
                    ) : plan.id === "free" ? (
                      "Switch to Free"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
        <InvoiceHistorySection
          invoices={invoices}
          isLoading={invoiceLoading}
          error={invoiceError}
        />
      </div>
    </>
  );
}
type InvoiceSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created: number | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  billingPeriodEnd: number | null;
};

function InvoiceHistorySection({
  invoices,
  isLoading,
  error,
}: {
  invoices: InvoiceSummary[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Loading your latest invoice history…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Recent billing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invoices.length) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            You’ll see invoices here after your first payment successfully completes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/40 p-10 text-center text-sm text-muted-foreground">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
            <p>No invoices available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Download receipts and track your billing history.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{formatInvoiceDate(invoice.created)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  {formatInvoiceAmount(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {invoice.hostedInvoiceUrl || invoice.invoicePdf ? (
                    <div className="flex justify-end gap-2">
                      {invoice.hostedInvoiceUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatInvoiceAmount(total: number, currency: string) {
  const amount = (total ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency?.toUpperCase() || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatInvoiceDate(timestamp: number | null) {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const intent =
    normalized === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : normalized === "open"
        ? "bg-amber-100 text-amber-700"
        : normalized === "void"
          ? "bg-muted text-muted-foreground"
          : normalized === "uncollectible"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${intent}`}>
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
}
