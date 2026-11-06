export function toPlanSummary(response: any) {
  const status = response?.data ?? response ?? {}
  const subscription = status.subscription ?? {}

  return {
    plan: subscription.planName ?? null,
    status: subscription.status ?? null,
    interval: subscription.interval ?? null,
    amount: subscription.amount ?? null,
    currency: subscription.currency ?? null,
    renews_on: subscription.currentPeriodEnd ?? null,
    cancels_at_period_end: subscription.cancelAtPeriodEnd ?? false,
    pending_plan_change: subscription.pendingPlanChange ?? null,
    trial: status.trial?.isTrialing ? { days_remaining: status.trial.daysRemaining } : null,
    has_access: status.access?.hasAccess ?? null,
    limits: status.limits ?? null,
    usage: status.usage ?? null,
    all_plans: status.plans ?? [],
  }
}
