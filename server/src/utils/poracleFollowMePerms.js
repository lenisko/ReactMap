// @ts-check
const config = require('@rm/config')

/**
 * Check if user has any role that matches poracleFollowMe config
 * @param {string[]} roles - User's roles
 * @param {string} provider - 'discordRoles' | 'telegramGroups' | 'local'
 * @returns {boolean}
 */
function poracleFollowMePerms(roles, provider) {
  const poracleFollowMe = config.getSafe('poracleFollowMe') || {}
  const configRoles = poracleFollowMe[provider] || []
  if (configRoles.length === 0) return false
  return roles.some((role) => configRoles.includes(role))
}

module.exports = { poracleFollowMePerms }
