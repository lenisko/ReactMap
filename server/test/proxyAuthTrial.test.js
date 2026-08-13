// @ts-check
const test = require('node:test')
const assert = require('node:assert')

const { ProxyAuthClient } = require('../src/services/ProxyAuthClient')

/**
 * Build a bare client with just the fields the perm calculation reads, so the
 * test does not need config files, a database or a live trial manager.
 *
 * @param {{ trialActive?: boolean, trialRoles?: string[] }} [options]
 * @returns {ProxyAuthClient}
 */
function makeClient({ trialActive = false, trialRoles = [] } = {}) {
  const client = /** @type {ProxyAuthClient} */ (
    Object.create(ProxyAuthClient.prototype)
  )
  client.perms = {
    map: { enabled: true, roles: ['Donator'], trialPeriodEligible: true },
    scanCells: {
      enabled: true,
      roles: ['Super Donator'],
      trialPeriodEligible: true,
    },
    pokemon: { enabled: true, roles: ['Donator'], trialPeriodEligible: false },
  }
  client.alwaysEnabledPerms = []
  client.strategy = { trialPeriod: { roles: trialRoles } }
  client.trialManager = { active: () => trialActive }
  return client
}

test('trial does not apply to users who already have map access', () => {
  const client = makeClient({ trialActive: true })

  assert.strictEqual(client.trialApplies(['Donator']), false)

  const perms = client.getPerms(['Donator'])
  assert.strictEqual(perms.trial, false)
  assert.strictEqual(perms.map, true)
  // scanCells belongs to a role they do not have - a trial must not grant it
  assert.strictEqual(perms.scanCells, false)
})

test('perms of an access-holding user are identical with and without a trial', () => {
  const roles = ['Donator']
  const off = makeClient({ trialActive: false }).getPerms(roles)
  const on = makeClient({ trialActive: true }).getPerms(roles)

  assert.deepStrictEqual(on, off)
})

test('trial still grants access to users without any', () => {
  const client = makeClient({ trialActive: true })

  assert.strictEqual(client.trialApplies(['Nobody']), true)

  const perms = client.getPerms(['Nobody'])
  assert.strictEqual(perms.trial, true)
  assert.strictEqual(perms.map, true)
  assert.strictEqual(perms.scanCells, true)
  // not trial eligible, so it stays off
  assert.strictEqual(perms.pokemon, false)
})

test('a trial limited to roles only reaches those roles', () => {
  const client = makeClient({ trialActive: true, trialRoles: ['Guest'] })

  assert.deepStrictEqual(client.getPerms(['Nobody']).map, false)
  assert.deepStrictEqual(client.getPerms(['Guest']).map, true)
  assert.deepStrictEqual(client.getPerms(['Guest']).trial, true)
})

test('an inactive trial changes nothing', () => {
  const client = makeClient({ trialActive: false })

  assert.strictEqual(client.trialApplies(['Nobody']), false)
  assert.strictEqual(client.getPerms(['Nobody']).map, false)
  assert.strictEqual(client.getPerms(['Nobody']).trial, false)
})
