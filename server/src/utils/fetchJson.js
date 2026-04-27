// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { default: fetch, Response } = require('node-fetch')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

/**
 * fetch wrapper with timeout and error handling
 * @param {string} url
 * @param {import('node-fetch').RequestInit} [options]
 * @returns
 */
async function fetchJson(url, options = undefined) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.getSafe('api.fetchTimeoutMs'))

  try {
    log.debug(TAGS.fetch, url, options || '')
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`, {
        cause: response,
      })
    }
    return response.json()
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.cause instanceof Response &&
        e.cause.status === 404 &&
        url.includes('/api/pokemon/id')
      )
        return e.cause
      log.error(TAGS.fetch, `Unable to fetch ${url}`, '\n', e)
      if (options) {
        try {
          const logDir = config.resolveLogDir()
          fs.mkdirSync(logDir, { recursive: true })
          fs.writeFileSync(
            resolve(
              logDir,
              `${url.replaceAll(/[/:]/g, '_')}${Math.floor(Date.now() / 1000)}.json`,
            ),
            JSON.stringify(options, null, 2),
          )
        } catch (logErr) {
          log.warn(TAGS.fetch, 'Failed to write fetch debug log', logErr)
        }
      }
      return e.cause
    }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { fetchJson }
