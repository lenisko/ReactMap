// @ts-check
const { expressMiddleware } = require('@as-integrations/express5')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { GraphQLError } = require('graphql')
const { parse } = require('graphql')

const config = require('@rm/config')

const { state } = require('../services/state')
const { version } = require('../../../package.json')
const { DataLimitCheck } = require('../services/DataLimitCheck')
const { permsHash, isComparableHash } = require('../utils/permsHash')

/**
 *
 * @param {Awaited<ReturnType<import('../graphql/server')['startApollo']>>} server
 * @returns
 */
function apolloMiddleware(server) {
  return expressMiddleware(server, {
    context: async ({ req, res }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const username = req?.user?.username || ''
      const id = req?.user?.id || 0

      const clientVHeader = req.headers['apollographql-client-version']
      const clientV =
        (typeof clientVHeader === 'string' && clientVHeader.trim()) ||
        version ||
        1
      const serverV = version || 1

      const definition =
        /** @type {import('graphql').OperationDefinitionNode} */ (
          parse(req.body.query).definitions.find(
            (d) => d.kind === 'OperationDefinition',
          )
        )
      const endpoint = definition?.name?.value || ''
      const userDataLimit = new DataLimitCheck(req)

      const errorCtx = {
        id,
        user: username,
        clientV,
        serverV,
        endpoint: userDataLimit.category,
      }

      // Allow the hot-reload dev client to bypass strict version matching
      const isDevClient = clientV === 'development'

      if (clientV && serverV && clientV !== serverV && !isDevClient) {
        throw new GraphQLError('old_client', {
          extensions: {
            ...errorCtx,
            http: { status: 464 },
            code: ApolloServerErrorCode.BAD_USER_INPUT,
          },
        })
      }

      if (!perms && endpoint !== 'Locales') {
        throw new GraphQLError('session_expired', {
          extensions: {
            ...errorCtx,
            http: { status: 511 },
            code: 'EXPIRED',
          },
        })
      }

      if (
        definition?.operation === 'mutation' &&
        !id &&
        endpoint !== 'SetTutorial'
      ) {
        throw new GraphQLError('unauthenticated', {
          extensions: {
            ...errorCtx,
            http: { status: 401 },
            code: 'UNAUTHENTICATED',
          },
        })
      }

      if (await userDataLimit.isOverLimit()) {
        throw new GraphQLError('data_limit_reached', {
          extensions: {
            ...errorCtx,
            until: userDataLimit.until,
            http: { status: 429 },
            code: ApolloServerErrorCode.BAD_REQUEST,
          },
        })
      }

      if (perms && Object.keys(perms).length) {
        const currentHash = permsHash(perms)
        const currentRoles = req.session.proxyRoles || ''
        const previousRoles = req.session.permsRoles || ''
        // A baseline from an older hash version is not comparable - adopt it
        // silently rather than reporting a change that never happened.
        const hashChanged =
          isComparableHash(req.session.permsHash) &&
          req.session.permsHash !== currentHash
        const changedKeys = req.session.permsChangedKeys || []
        req.session.permsHash = currentHash
        req.session.permsRoles = currentRoles
        if (hashChanged || req.session.permsChanged) {
          delete req.session.permsChanged
          delete req.session.permsChangedKeys
          req.session.save()
          throw new GraphQLError('perms_changed', {
            extensions: {
              ...errorCtx,
              rolesFrom: previousRoles,
              rolesTo: currentRoles,
              changedPerms: changedKeys,
              http: { status: 465 },
              code: 'PERMS_CHANGED',
            },
          })
        }
      }

      if (id && config.getSafe('api.manualSessionControl')) {
        const now = Date.now()
        const cached = req.session.sessionValid
        if (!cached || now > cached.until) {
          const valid = await state.db.models.Session.isValidSession(id)
          req.session.sessionValid = { valid, until: now + 60000 }
          if (!valid) {
            req.session.save()
            throw new GraphQLError('too_many_sessions', {
              extensions: {
                ...errorCtx,
                http: { status: 466 },
                code: 'TOO_MANY_SESSIONS',
              },
            })
          }
        } else if (!cached.valid) {
          throw new GraphQLError('too_many_sessions', {
            extensions: {
              ...errorCtx,
              http: { status: 466 },
              code: 'TOO_MANY_SESSIONS',
            },
          })
        }
      }

      return {
        userId: id,
        username,
        req,
        res,
        Db: state.db,
        Event: state.event,
        perms,
        token: req.headers.token,
        operation: definition?.operation,
      }
    },
  })
}

module.exports = { apolloMiddleware }
