// @ts-check
const config = require('@rm/config')

/**
 *
 * @param {string[]} roles
 * @param {string} provider
 * @param {boolean} [trialActive]
 * @returns {string[]}
 */
function webhookPerms(roles, provider, trialActive = false) {
  const perms = []
  roles.forEach((role) => {
    config.getSafe('webhooks').forEach((webhook) => {
      if (
        webhook.enabled &&
        (webhook?.[provider]?.includes(role) ||
          (trialActive && webhook?.trialPeriodEligible))
      ) {
        perms.push(webhook.name)
      }
    })
  })
  // Sort for a deterministic result: the perms object is hashed to detect
  // permission changes, so order must not depend on incoming role order.
  return [...new Set(perms)].sort()
}

module.exports = { webhookPerms }
