// Perform transforms on SQL models so they can be used with other databases
import { SnakeCaseNamingStrategy, CamelCaseNamingStrategy } from './naming-strategies'

const dbModels: Array<any> = ['Hello']

const postgres = (models, options) => {
  // Apply snake case naming strategy for Postgres databases
  if (!options.namingStrategy) {
    options.namingStrategy = new SnakeCaseNamingStrategy()
  }

  // Only transforms models that are not custom models
  const { models: customModels = {} } = options

  // For Postgres we need to use the `timestamp with time zone` type
  // aka `timestamptz` to store timestamps correctly in UTC.
  dbModels.forEach(model => {
    if(customModels[model]) return
    for (const column in models[model].schema.columns) {
        if (models[model].schema.columns[column].type === 'timestamp') {
          models[model].schema.columns[column].type = 'timestamptz'
        }
    }
  })
}

const mongodb = (models, options) => {
  // A CamelCase naming strategy is used for all document databases
  if (!options.namingStrategy) {
    options.namingStrategy = new CamelCaseNamingStrategy()
  }

  // Important!
  //
  // 1. You must set 'objectId: true' on one property on a model in MongoDB.
  //
  //   'objectId' MUST be set on the primary ID field. This overrides other
  //   values on that object in TypeORM (e.g. type: 'int' or 'primary').
  //
  // 2. Other properties that are Object IDs in the same model MUST be set to
  //    type: 'objectId' (and should not be set to `objectId: true`).
  //
  //    If you set 'objectId: true' on multiple properties on a model you will
  //    see the result of queries like find() is wrong. You will see the same
  //    Object ID in every property of type Object ID in the result (but the
  //    database will look fine); so use `type: 'objectId'` for them instead.

  // Only transforms models that are not custom models
  const { models: customModels = {} } = options

  dbModels.forEach(model => {
    if(customModels[model]) return
    for (const column in models[model].schema.columns) {
      delete models[model].schema.columns.id.type
      models[model].schema.columns.id.objectId = true
      models[model].schema.columns.userId.type = 'objectId'
    }
  })
}

const sqlite = (models, options) => {
  // Apply snake case naming strategy for SQLite databases
  if (!options.namingStrategy) {
    options.namingStrategy = new SnakeCaseNamingStrategy()
  }

  // Only transforms models that are not custom models
  const { models: customModels = {} } = options

  // SQLite does not support `timestamp` fields so we remap them to `datetime`
  // in all models.
  //
  // `timestamp` is an ANSI SQL specification and widely supported by other
  // databases so this transform is a specific workaround required for SQLite.
  //
  // NB: SQLite adds 'create' and 'update' fields to allow rows, but that is
  // specific to SQLite and so we ignore that behaviour.
  dbModels.forEach(model => {
    if(customModels[model]) return
    for (const column in models[model].schema.columns) {
      if (models[model].schema.columns[column].type === 'timestamp') {
        models[model].schema.columns[column].type = 'datetime'
      }
    }
  })
}

export default (config, models, options) => {
  if ((config.type && config.type.startsWith('mongodb')) ||
      (config.url && config.url.startsWith('mongodb'))) {
    mongodb(models, options)
  } else if ((config.type && config.type.startsWith('postgres')) ||
             (config.url && config.url.startsWith('postgres'))) {
    postgres(models, options)
  } else if ((config.type && config.type.startsWith('sqlite')) ||
             (config.url && config.url.startsWith('sqlite'))) {
    sqlite(models, options)
  } else {
    // Apply snake case naming strategy by default for SQL databases
    if (!options.namingStrategy) {
      options.namingStrategy = new SnakeCaseNamingStrategy()
    }
  }
}