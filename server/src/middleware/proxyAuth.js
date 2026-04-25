// @ts-check
const passport = require('passport')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { state } = require('../services/state')

/**
 * Resolve role names to IDs via aliases and combine with raw role IDs.
 *
 * @param {string} rolesRaw
 * @param {string} roleIdsRaw
 * @param {Record<string, string | string[]>} aliasMap
 * @param {string} sep
 * @returns {string[]}
 */
function resolveRoles(rolesRaw, roleIdsRaw, aliasMap, sep) {
  const roleNames = rolesRaw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
  const roleIds = roleIdsRaw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
  const resolved = roleNames.flatMap((name) => {
    const id = aliasMap[name]
    return id ? [name, ...(Array.isArray(id) ? id : [id])] : [name]
  })
  return [...resolved, ...roleIds]
}

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
    const client = state.event.authClients[strategy.name || 'proxy']
    if (client && client.getPerms) {
      const allRoles = resolveRoles(
        headerRoles,
        headerRoleIds,
        client.aliasMap,
        client.roleSeparator,
      )
      Object.assign(req.user.perms, client.getPerms(allRoles))
    }
    return next()
  }

  const strategyName = strategy.name || 'proxy'

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
      req.login(user, async (loginErr) => {
        if (loginErr) {
          log.error(TAGS.auth, 'Proxy auth login error:', loginErr)
          return next()
        }
        const { id } = user
        if (!(await state.db.models.Session.isValidSession(id))) {
          log.info(
            TAGS.auth,
            'Detected multiple sessions, clearing old ones...',
          )
          await state.db.models.Session.clearOtherSessions(id, req.sessionID)
        }
        req.session.proxyRoles = headerRoles
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
