const glob = require('glob');
const path = require('path');
const uuid = require('uuid');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const idGenerator = () =>
  uuid.v4(undefined, Buffer.alloc(16))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

module.exports.idGenerator = idGenerator;

module.exports.mongoose = (configs) => {
  if (typeof configs !== 'object') throw TypeError('configs must be array or object');

  const configArray = Array.isArray(configs) ? configs : [configs];
  const multiConns = configArray.length > 1;
  const modelList = {};

  configArray.forEach((config) => {
    if (multiConns && !config.namespace) {
      throw TypeError('namespace is required multiple connection mode');
    }
    if (!config.uri) throw TypeError('uri is needed to connect to mongodb server');
    if (!config.schemas) throw TypeError('schemas needed for defining models');

    const namespace = multiConns ? config.namespace : '';
    const schemas = config.schemas.endsWith('/') ? config.schemas : `${config.schemas}/`;
    const files = glob.sync(`${schemas}**/*.js`);
    const mongopts = { useMongoClient: true, ...config.options };

    const conn = mongoose.createConnection(config.uri, mongopts);
    files.forEach((file) => {
      const baseName = path.basename(file, '.js');
      const modelName = multiConns ? `${namespace}/${baseName}` : baseName;
      if (Object.hasOwnProperty.call(modelList, modelName)) {
        throw TypeError(`error, multiple definitions of model ${modelName}`);
      }

      let schema = require(file);
      if (typeof schema === 'object') {
        if (!schema.id) {
          schema.id = {
            type: String,
            default: idGenerator,
            unique: true,
          };
        }
        schema = new mongoose.Schema(schema);
      } else if (typeof schema === 'function') {
        schema = schema();
      } else {
        throw TypeError('schema definition must be a function or an object');
      }
      modelList[modelName] = conn.model(baseName, schema);
    });
  });

  return async (ctx, next) => {
    ctx.model = name => modelList[name];
    ctx.document = (name, obj) => new modelList[name](obj);

    await next();
  };
};
