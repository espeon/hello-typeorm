// from iaincollins/next-auth

declare var URL: any

import { EntitySchema } from 'typeorm'

const parseConnectionString = (configString) => {
  if (typeof configString !== 'string') { return configString }

  // If the input is URL string, automatically convert the string to an object
  // to make configuration easier (in most use cases).
  //
  // TypeORM accepts connection string as a 'url' option, but unfortunately
  // not for all databases (e.g. SQLite) or for all options, so we handle
  // parsing it in this function.
  try {
    const parsedUrl = new URL(configString)
    const config: any = {}

    if (parsedUrl.protocol.startsWith('mongodb+srv')) {
      // Special case handling is required for mongodb+srv with TypeORM
      config.type = 'mongodb'
      config.url = configString.replace(/\?(.*)$/, '')
      config.useNewUrlParser = true
    } else {
      config.type = parsedUrl.protocol.replace(/:$/, '')
      config.host = parsedUrl.hostname
      config.port = Number(parsedUrl.port)
      config.username = parsedUrl.username
      config.password = parsedUrl.password
      config.database = parsedUrl.pathname.replace(/^\//, '').replace(/\?(.*)$/, '')
    }

    // This option is recommended by mongodb
    if (config.type === 'mongodb') {
      config.useUnifiedTopology = true
    }

    if (parsedUrl.search) {
      parsedUrl.search.replace(/^\?/, '').split('&').forEach(keyValuePair => {
        let [key, value] = keyValuePair.split('=')
        let val: boolean
        // Converts true/false strings to actual boolean values
        if (value === 'true') { val = true }
        if (value === 'false') { val = false }
        config[key] = val
      })
    }

    return config
  } catch (error) {
    // If URL parsing fails for any reason, try letting TypeORM handle it
    return {
      url: configString
    }
  }
}

const loadConfig = (config, { models, namingStrategy }) => {
  const defaultConfig = {
    name: 'default',
    autoLoadEntities: true,
    entities: [
      new EntitySchema(models.Hello.schema),
    ],
    timezone: 'Z', // Required for timestamps to be treated as UTC in MySQL
    logging: false,
    namingStrategy
  }

  return {
    ...defaultConfig,
    ...config
  }
}

export default {
  parseConnectionString,
  loadConfig
}