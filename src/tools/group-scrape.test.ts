import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupScrapeBody } from './group-scrape.js'

const base = { name: 'Investors', group_id: '123', account_id: 'acc' }

test('leaves the members source to the API default unless asked', () => {
  assert.deepEqual(groupScrapeBody(base), { ...base, group_target_countries: [] })
  assert.ok(!('members_source' in groupScrapeBody({ ...base, things_in_common: false })))
})

test('maps things_in_common to the members source the API expects', () => {
  const body = groupScrapeBody({ ...base, things_in_common: true })
  assert.equal(body.members_source, 'things_in_common')
  assert.ok(!('things_in_common' in body))
})

test('only a real true turns it on', () => {
  assert.ok(!('members_source' in groupScrapeBody({ ...base, things_in_common: 'false' })))
})

test('keeps the caller target countries', () => {
  assert.deepEqual(groupScrapeBody({ ...base, group_target_countries: ['Spain'] }).group_target_countries, ['Spain'])
})
