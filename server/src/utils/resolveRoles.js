// @ts-check

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

module.exports = { resolveRoles }
