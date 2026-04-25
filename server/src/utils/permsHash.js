// @ts-check
const crypto = require('crypto')

/** @param {Record<string, any>} perms */
function permsHash(perms) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(perms))
    .digest('hex')
    .slice(0, 16)
}

module.exports = { permsHash }
