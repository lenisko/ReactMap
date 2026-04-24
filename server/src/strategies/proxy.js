// @ts-check
const config = require('@rm/config')
const { ProxyAuthClient } = require('../services/ProxyAuthClient')

/**
 * @param {string} strategy
 * @returns {ProxyAuthClient | undefined}
 */
module.exports = (strategy) => {
  const strategyConfig = config
    .getSafe('authentication.strategies')
    .find((s) => s.name === strategy)
  if (strategyConfig) {
    const Client = new ProxyAuthClient(strategy, strategyConfig)
    Client.initPassport()
    return Client
  }
}
