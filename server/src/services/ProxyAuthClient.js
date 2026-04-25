// @ts-check
/* eslint-disable max-classes-per-file */
const passport = require('passport')

const config = require('@rm/config')

const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { resolveRoles } = require('../utils/resolveRoles')
const { AuthClient } = require('./AuthClient')
const { state } = require('./state')

/**
 * Passport strategy that authenticates from reverse proxy headers.
 * Header names are configurable via the strategy config.
 */
class ProxyStrategy extends passport.Strategy {
  /**
   * @param {(req: import('express').Request, done: Function) => void} verify
   */
  constructor(verify) {
    super()
    this.name = 'proxy'
    this._verify = verify
  }

  /** @param {import('express').Request} req */
  authenticate(req) {
    this._verify(req, (err, user, info) => {
      if (err) return this.error(err)
      if (!user) return this.fail(info, 401)
      this.success(user, info)
    })
  }
}

/** @type {Readonly<Record<string, string>>} */
const DEFAULT_HEADERS = {
  id: 'x-user-id',
  username: 'x-user-username',
  roles: 'x-user-roles',
  roleIds: 'x-user-role-ids',
}

class ProxyAuthClient extends AuthClient {
  /** @type {import('./AuthClient').ClientConstructor} */
  constructor(rmStrategy, strategy) {
    super(rmStrategy, strategy)
    /** @type {string} Provider field name for webhook/scanner role lookups */
    this.provider = strategy.provider || 'proxyRoles'
    /** @type {string} Separator for role header values */
    this.roleSeparator = strategy.roleSeparator || ','
    /** @type {Record<string, string>} Lowercase header names */
    this.headers = Object.fromEntries(
      Object.entries({ ...DEFAULT_HEADERS, ...strategy.headers }).map(
        ([k, v]) => [k, v.toLowerCase()],
      ),
    )
    /** @type {Record<string, string | string[]>} Alias name → role ID mapping */
    this.aliasMap = Object.fromEntries(
      config.getSafe('authentication.aliases').map((a) => [a.name, a.role]),
    )
  }

  /**
   * Read a header value from the request.
   *
   * @param {import('express').Request} req
   * @param {string} key Header key from `this.headers`
   * @returns {string}
   */
  readHeader(req, key) {
    const name = this.headers[key]
    if (!name) return ''
    const value = req.headers[name]
    return typeof value === 'string' ? value : ''
  }

  /**
   * Calculate permissions from role names and role IDs.
   * Roles are matched against `authentication.perms[*].roles` in config.
   *
   * @param {string[]} roles Combined role names + role IDs
   * @returns {Record<string, boolean>}
   */
  getPerms(roles) {
    const trialActive = this.trialManager.active()
    /** @type {Record<string, boolean>} */
    const perms = Object.fromEntries(
      Object.keys(this.perms).map((key) => [key, false]),
    )
    perms.admin = false
    perms.trial = false

    Object.entries(this.perms).forEach(([perm, info]) => {
      if (!info.enabled) return
      if (this.alwaysEnabledPerms.includes(perm) || !info.roles.length) {
        perms[perm] = true
        return
      }
      if (
        trialActive &&
        info.trialPeriodEligible &&
        !this.strategy.trialPeriod?.roles?.length
      ) {
        perms[perm] = true
        perms.trial = true
        return
      }
      roles.some((role) => {
        if (info.roles.includes(role)) {
          perms[perm] = true
          return true
        }
        if (
          trialActive &&
          info.trialPeriodEligible &&
          this.strategy.trialPeriod?.roles?.includes(role)
        ) {
          perms[perm] = true
          perms.trial = true
          return true
        }
        return false
      })
    })

    return perms
  }

  /**
   * Authenticate a request using reverse proxy headers.
   *
   * @param {import('express').Request} req
   * @param {Function} done
   */
  async authHandler(req, done) {
    const userId = this.readHeader(req, 'id')
    const username = this.readHeader(req, 'username') || 'Unknown'
    const rolesRaw = this.readHeader(req, 'roles')
    const roleIdsRaw = this.readHeader(req, 'roleIds')

    if (!userId) {
      return done(null, false, { message: 'no_proxy_headers' })
    }

    const allRoles = resolveRoles(
      rolesRaw,
      roleIdsRaw,
      this.aliasMap,
      this.roleSeparator,
    )
    const trialActive = this.trialManager.active()
    const perms = this.getPerms(allRoles)

    this.log.debug(
      'Proxy perms check:',
      'roles=',
      allRoles,
      'configMapRoles=',
      this.perms.map?.roles,
      'mapResult=',
      perms.map,
    )

    const user = {
      id: undefined,
      proxyId: userId,
      username,
      perms: /** @type {import('@rm/types').Permissions} */ ({
        ...perms,
        areaRestrictions: areaPerms(allRoles),
        webhooks: webhookPerms(allRoles, this.provider, trialActive),
        scanner: scannerPerms(allRoles, this.provider, trialActive),
        scannerCooldownBypass: scannerCooldownBypass(allRoles, this.provider),
      }),
      rmStrategy: this.rmStrategy,
    }

    if (!user.perms.map) {
      return done(null, false, { message: 'access_denied' })
    }

    try {
      const forceTutorial = config.getSafe('map.misc.forceTutorial')
      /** @type {import('@rm/types').FullUser | undefined} */
      let dbUser = await state.db.models.User.query().findOne({
        proxyId: userId,
      })

      if (!dbUser) {
        dbUser = await state.db.models.User.query().insertAndFetch({
          proxyId: userId,
          username,
          strategy: 'proxy',
          tutorial: !forceTutorial,
        })
      } else if (dbUser.username !== username) {
        await state.db.models.User.query()
          .update({ username })
          .where('id', dbUser.id)
      }

      user.id = dbUser.id
      user.data = dbUser.data
      user.selectedWebhook = dbUser.selectedWebhook

      this.log.info(username, `(${userId})`, 'Authenticated via proxy')
      return done(null, user)
    } catch (e) {
      this.log.error('Proxy auth failed', e)
      return done(e)
    }
  }

  // eslint-disable-next-line class-methods-use-this, no-empty-function
  async sendMessage() {}

  initPassport() {
    passport.use(
      this.rmStrategy,
      new ProxyStrategy((...args) => this.authHandler(...args)),
    )
  }
}

module.exports = { ProxyAuthClient }
