import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toPlanSummary } from './plan.js'

const response = {
  success: true,
  data: {
    subscription: { id: 'sub_secret', productId: 'prod_secret', planName: 'Momentum', status: 'active', amount: 289, interval: 'month' },
    trial: { isTrialing: false, daysRemaining: 0 },
    limits: { maxCampaigns: 30, aiFeatures: false, accountSetup: false },
    usage: { runningCampaigns: 2, activeCampaignAccounts: 6 },
    plans: [{ key: 'apex', name: 'Apex', features: ['AI target countries'] }],
    access: { hasAccess: true },
    paymentMethod: { id: 'pm_secret', brand: 'visa', last4: '3155' },
    proxies: { pool: { assigned: 8 } },
  },
}

test('keeps what an agent needs to plan its work', () => {
  const summary = toPlanSummary(response)
  assert.equal(summary.plan, 'Momentum')
  assert.equal(summary.limits?.aiFeatures, false)
  assert.equal(summary.usage?.activeCampaignAccounts, 6)
  assert.equal(summary.all_plans[0].key, 'apex')
  assert.equal(summary.has_access, true)
})

test('never passes on payment details or internal ids', () => {
  const text = JSON.stringify(toPlanSummary(response))
  for (const secret of ['3155', 'visa', 'pm_secret', 'sub_secret', 'prod_secret']) {
    assert.ok(!text.includes(secret), secret)
  }
})

test('reports a trial only when one is running', () => {
  const summary = toPlanSummary({ data: { trial: { isTrialing: true, daysRemaining: 4 } } })
  assert.deepEqual(summary.trial, { days_remaining: 4 })
  assert.equal(toPlanSummary(response).trial, null)
})

test('copes with an empty response', () => {
  assert.equal(toPlanSummary(undefined).plan, null)
})
