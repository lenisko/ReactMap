// @ts-check
const passport = require('passport')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { state } = require('../services/state')

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

  const userId = req.headers[idHeader]
  if (!userId || typeof userId !== 'string') return next()

  const headerRoles = /** @type {string} */ (req.headers[rolesHeader] || '')

  // Same user, same roles — use existing session
  if (
    req.user &&
    req.user.proxyId === userId &&
    req.session.proxyRoles === headerRoles
  ) {
    return next()
  }

  const strategyName = strategy.name || 'proxy'

  // eslint-disable-next-line no-unused-vars
  passport.authenticate(strategyName, (err, user, _info) => {
    if (err) {
      log.error(TAGS.auth, 'Proxy auth error:', err)
      return next()
    }
    if (!user) {
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
