// @ts-check
const passport = require('passport')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { state } = require('../services/state')
const { areaPerms } = require('../utils/areaPerms')
const { webhookPerms } = require('../utils/webhookPerms')
const { scannerPerms, scannerCooldownBypass } = require('../utils/scannerPerms')
const { permsHash, permsDiff } = require('../utils/permsHash')
const { resolveRoles } = require('../utils/resolveRoles')

/**
 * Auto-login middleware for proxy-based auth (e.g. nginx auth_request).
 *
 * Reads user identity headers set by a reverse proxy and creates a
 * passport session automatically. Skips when:
 * - No user ID header present (not behind auth proxy)
 * - Session already exists with same user + same roles
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function proxyAuth(req, res, next) {
  const strategy = config
    .getSafe('authentication.strategies')
    .find((s) => s.type === 'proxy' && s.enabled)
  if (!strategy) return next()

  const idHeader = (strategy.headers?.id || 'x-user-id').toLowerCase()
  const rolesHeader = (strategy.headers?.roles || 'x-user-roles').toLowerCase()
  const roleIdsHeader = (
    strategy.headers?.roleIds || 'x-user-role-ids'
  ).toLowerCase()

  const userId = req.headers[idHeader]
  if (!userId || typeof userId !== 'string') return next()

  const headerRoles = /** @type {string} */ (req.headers[rolesHeader] || '')
  const headerRoleIds = /** @type {string} */ (req.headers[roleIdsHeader] || '')

  // Same user, same roles — refresh perms from config without full re-auth
  if (
    req.user &&
    req.user.proxyId === userId &&
    req.session.proxyRoles === headerRoles
  ) {
    if (!req.user.strategy) req.user.strategy = 'proxy'
    const client = state.event.authClients[strategy.name || 'proxy']
    if (client && client.getPerms) {
      const before = { ...req.user.perms }
      const allRoles = resolveRoles(
        headerRoles,
        headerRoleIds,
        client.aliasMap,
        client.roleSeparator,
      )
      const trialActive = client.trialApplies
        ? client.trialApplies(allRoles)
        : client.trialManager.active()
      Object.assign(req.user.perms, client.getPerms(allRoles), {
        areaRestrictions: areaPerms(allRoles),
        webhooks: webhookPerms(allRoles, client.provider, trialActive),
        scanner: scannerPerms(allRoles, client.provider, trialActive),
        scannerCooldownBypass: scannerCooldownBypass(allRoles, client.provider),
      })
      const changed = permsDiff(before, req.user.perms)
      if (changed.length) {
        req.session.permsChanged = true
        req.session.permsChangedKeys = changed
      }
    }
    return next()
  }

  const strategyName = strategy.name || 'proxy'

  // Captured before `req.login` regenerates the session. `keepSessionInfo`
  // copies the old session onto the new one, so any `permsHash` left there
  // describes perms that are about to be replaced - comparing against it is
  // what produced spurious `perms_changed` prompts. The only meaningful
  // baseline is the perms of the user that was actually logged in.
  const prevPerms = req.user ? req.user.perms : null

  passport.authenticate(strategyName, (err, user, info) => {
    if (err) {
      log.error(TAGS.auth, 'Proxy auth error:', err)
      return next()
    }
    if (!user) {
      log.warn(TAGS.auth, 'Proxy auth denied for', userId, info)
      // Auth failed (e.g. lost map perm) — logout existing session
      if (req.user) {
        return req.logout((logoutErr) => {
          if (logoutErr) log.error(TAGS.auth, 'Logout error:', logoutErr)
          req.session.proxyRoles = headerRoles
          req.session.save()
          next()
        })
      }
      req.session.proxyRoles = headerRoles
      req.session.save()
      return next()
    }

    const doLogin = () => {
      req.login(user, { keepSessionInfo: true }, async (loginErr) => {
        if (loginErr) {
          log.error(TAGS.auth, 'Proxy auth login error:', loginErr)
          return next()
        }
        req.session.proxyRoles = headerRoles
        req.session.meta = {
          userAgent: req.get('user-agent') || '',
          createdAt: Date.now(),
        }
        // Rebase the change detector onto the perms we just logged in with.
        const changed = prevPerms ? permsDiff(prevPerms, user.perms) : []
        req.session.permsHash = permsHash(user.perms)
        req.session.permsRoles = headerRoles
        if (changed.length) {
          req.session.permsChanged = true
          req.session.permsChangedKeys = changed
        } else {
          delete req.session.permsChanged
          delete req.session.permsChangedKeys
        }
        const { id } = user
        if (!(await state.db.models.Session.isValidSession(id))) {
          if (!config.getSafe('api.manualSessionControl')) {
            log.info(
              TAGS.auth,
              'Detected multiple sessions, clearing old ones...',
            )
            await state.db.models.Session.clearOtherSessions(id, req.sessionID)
          }
        }
        req.session.save()
        next()
      })
    }

    // Different user in session — logout first
    if (req.user && req.user.proxyId !== userId) {
      req.logout((logoutErr) => {
        if (logoutErr) log.error(TAGS.auth, 'Logout error:', logoutErr)
        doLogin()
      })
    } else {
      doLogin()
    }
  })(req, res, next)
}

module.exports = { proxyAuth }
