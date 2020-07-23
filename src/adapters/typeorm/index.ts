import { createConnection, getConnection, getManager } from 'typeorm'
//import { createHash } from 'crypto'

import adapterConfig from './lib/config'
import adapterTransform from './lib/transform'
import Models from './models'
import winston from '../../lib/winston'

const Adapter = (typeOrmConfig, options = {}) => {
  // Ensure typeOrmConfigObject is normalized to an object
  const typeOrmConfigObject = (typeof typeOrmConfig === 'string')
    ? adapterConfig.parseConnectionString(typeOrmConfig)
    : typeOrmConfig

  // Load models
  const models = {
    Hello: Models.Hello,
  }

  // The models are designed for ANSI SQL databases first (as a baseline).
  // For databases that use a different pragma, we transform the models at run
  // time *unless* the models are user supplied (in which case we don't do
  // anything to do them). This function updates arguments by reference.
  adapterTransform(typeOrmConfigObject, models, options)

  const config = adapterConfig.loadConfig(typeOrmConfigObject, { ...options, models } as any)

  // Create objects from models that can be consumed by functions in the adapter
  const Hello = models.Hello.model

  let connection = null

  async function getAdapter (appOptions) {
    // Helper function to reuse / restablish connections
    // (useful if they drop when after being idle)
    async function _connect () {
      // Get current connection by name
      connection = getConnection(config.name)

      // If connection is no longer established, reconnect
      if (!connection.isConnected) { connection = await connection.connect() }
    }

    if (!connection) {
      // If no connection, create new connection
      try {
        connection = await createConnection(config)
      } catch (error) {
        if (error.name === 'AlreadyHasActiveConnectionError') {
          // If creating connection fails because it's already
          // been re-established, check it's really up
          await _connect()
        } else {
          winston.error('ADAPTER_CONNECTION_ERROR', error)
        }
      }
    } else {
      // If the connection object already exists, ensure it's valid
      await _connect()
    }

    // Display debug output if debug option enabled
    // @TODO Refactor winston so is passed in appOptions
    function debugMessage (debugCode, ...args) {
      if (appOptions && appOptions.debug) {
        winston.debug(`TYPEORM_${debugCode}`, ...args)
      }
    }

    // The models are primarily designed for ANSI SQL database, but some
    // flexiblity is required in the adapter to support non-SQL databases such
    // as MongoDB which have different pragmas.
    //
    // TypeORM does some abstraction, but doesn't handle everything (e.g. it
    // handles translating `id` and `_id` in models, but not queries) so we
    // need to handle some things in the adapter to make it compatible.
    let idKey = 'id'
    let ObjectId
    if (config.type === 'mongodb') {
      idKey = '_id'
      // below ignored because it's mongo specific
      // @ts-ignore
      const mongodb = await import('mongodb')
      // @ts-ignore
      ObjectId = mongodb.ObjectId
    }

    // These values are stored as seconds, but to use them with dates in
    // JavaScript we convert them to milliseconds.
    //
    // Use a conditional to default to 30 day session age if not set - it should
    // always be set but a meaningful fallback is helpful to facilitate testing.
    if (appOptions && (!appOptions.session || !appOptions.session.maxAge)) {
      debugMessage('GET_ADAPTER', 'Session expiry not configured (defaulting to 30 days')
    }
    const defaultSessionMaxAge = 30 * 24 * 60 * 60 * 1000
    const sessionMaxAge = (appOptions && appOptions.session && appOptions.session.maxAge)
      ? appOptions.session.maxAge * 1000
      : defaultSessionMaxAge
    const sessionUpdateAge = (appOptions && appOptions.session && appOptions.session.updateAge)
      ? appOptions.session.updateAge * 1000
      : 0

    async function createHello (input) {
      debugMessage('CREATE_HELLO', input)
      try {
        // Create user account
        const hello = new Hello(input.title, input.description)
        return await getManager().save(hello)
      } catch (error) {
        winston.error('CREATE_HELLO_ERROR', error)
        return Promise.reject(new Error(error))
      }
    }

    async function getHello (id) {
      debugMessage('GET_HELLO', id)

      // In the very specific case of both using JWT for storing session data
      // and using MongoDB to store user data, the ID is a string rather than
      // an ObjectId and we need to turn it into an ObjectId.
      //
      // In all other scenarios it is already an ObjectId, because it will have
      // come from another MongoDB query.
      if (ObjectId && !(id instanceof ObjectId)) {
        id = ObjectId(id)
      }

      try {
        return connection.getRepository(Hello).findOne({ [idKey]: id })
      } catch (error) {
        winston.error('GET_USER_BY_ID_ERROR', error)
        return Promise.reject(new Error('GET_USER_BY_ID_ERROR'))
      }
    }

    async function deleteHello (id) {
      debugMessage('DELETE_HELLO', id)

      // In the very specific case of both using JWT for storing session data
      // and using MongoDB to store user data, the ID is a string rather than
      // an ObjectId and we need to turn it into an ObjectId.
      //
      // In all other scenarios it is already an ObjectId, because it will have
      // come from another MongoDB query.
      if (ObjectId && !(id instanceof ObjectId)) {
        id = ObjectId(id)
      }

      try {
        return connection.getRepository(Hello).findOne({ [idKey]: id }).delete();
      } catch (error) {
        winston.error('GET_USER_BY_ID_ERROR', error)
        return Promise.reject(new Error('GET_USER_BY_ID_ERROR'))
      }
    }

    return Promise.resolve({
      createHello,
      getHello
    })
  }

  return {
    getAdapter
  }
}

export default {
  Adapter,
  Models
}