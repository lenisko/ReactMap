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
  // Mirrors the common deployment shape: `map` is open to everyone, the
  // interesting perms are role gated, some of them trial eligible.
  client.perms = {
    map: { enabled: true, roles: [], trialPeriodEligible: false },
    pokemon: { enabled: true, roles: ['Donator'], trialPeriodEligible: true },
    scanCells: {
      enabled: true,
      roles: ['Super Donator'],
      trialPeriodEligible: true,
    },
    portals: { enabled: true, roles: ['Donator'], trialPeriodEligible: false },
  }
  client.alwaysEnabledPerms = []
  client.strategy = { trialPeriod: { roles: trialRoles } }
  client.trialManager = { active: () => trialActive }
  return client
}

test('trial does not apply to users whose roles already earn them perms', () => {
  const client = makeClient({ trialActive: true })

  assert.strictEqual(client.trialApplies(['Donator']), false)

  const perms = client.getPerms(['Donator'])
  assert.strictEqual(perms.trial, false)
  assert.strictEqual(perms.pokemon, true)
  // scanCells belongs to a role they do not have - a trial must not grant it
  assert.strictEqual(perms.scanCells, false)
})

test('an open map perm does not make everyone look privileged', () => {
  const client = makeClient({ trialActive: true })

  // holds nothing beyond what a role-less user gets, so the trial is for them
  assert.strictEqual(client.trialApplies(['Unknown Role']), true)
  assert.strictEqual(client.getPerms(['Unknown Role']).pokemon, true)
})

test('perms of a role-holding user are identical with and without a trial', () => {
  const roles = ['Donator']
  const off = makeClient({ trialActive: false }).getPerms(roles)
  const on = makeClient({ trialActive: true }).getPerms(roles)

  assert.deepStrictEqual(on, off)

  const superOff = makeClient({ trialActive: false }).getPerms([
    'Super Donator',
  ])
  const superOn = makeClient({ trialActive: true }).getPerms(['Super Donator'])

  assert.deepStrictEqual(superOn, superOff)
})

test('trial still grants perms to users without any roles', () => {
  const client = makeClient({ trialActive: true })

  assert.strictEqual(client.trialApplies([]), true)

  const perms = client.getPerms([])
  assert.strictEqual(perms.trial, true)
  assert.strictEqual(perms.pokemon, true)
  assert.strictEqual(perms.scanCells, true)
  // not trial eligible, so it stays off
  assert.strictEqual(perms.portals, false)
})

test('a trial limited to roles only reaches those roles', () => {
  const client = makeClient({ trialActive: true, trialRoles: ['Guest'] })

  assert.strictEqual(client.getPerms([]).pokemon, false)
  assert.strictEqual(client.getPerms(['Guest']).pokemon, true)
  assert.strictEqual(client.getPerms(['Guest']).trial, true)
})

test('an inactive trial changes nothing', () => {
  const client = makeClient({ trialActive: false })

  assert.strictEqual(client.trialApplies([]), false)
  assert.strictEqual(client.getPerms([]).pokemon, false)
  assert.strictEqual(client.getPerms([]).trial, false)
})
