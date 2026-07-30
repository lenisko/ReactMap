// @ts-check
const crypto = require('crypto')

/**
 * Hash format version. Bumping it invalidates every baseline stored in an
 * existing session, which makes the next comparison a no-op instead of a
 * false "permissions changed" for every logged in user.
 */
const VERSION = '2'

/**
 * Recursively sort object keys so the hash depends on values only, never on
 * the insertion order of the object it was built from. Array order is left
 * alone - the perm arrays are already sorted by their producers.
 *
 * @param {any} value
 * @returns {any}
 */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    )
  }
  return value
}

/** @param {Record<string, any>} perms */
function permsHash(perms) {
  return `${VERSION}:${crypto
    .createHash('sha1')
    .update(JSON.stringify(canonical(perms)))
    .digest('hex')
    .slice(0, 16)}`
}

/**
 * A stored baseline is only comparable when it was produced by the current
 * hash version.
 *
 * @param {unknown} hash
 * @returns {hash is string}
 */
function isComparableHash(hash) {
  return typeof hash === 'string' && hash.startsWith(`${VERSION}:`)
}

/**
 * List the perm keys whose values differ, for logging.
 *
 * @param {Record<string, any>} [before]
 * @param {Record<string, any>} [after]
 * @returns {string[]}
 */
function permsDiff(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  /** @type {string[]} */
  const changed = []
  keys.forEach((key) => {
    if (
      JSON.stringify(canonical(before[key])) !==
      JSON.stringify(canonical(after[key]))
    ) {
      changed.push(key)
    }
  })
  return changed.sort()
}

module.exports = { permsHash, permsDiff, isComparableHash }
