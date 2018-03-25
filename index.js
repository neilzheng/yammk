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

module.exports.Mongoose = (configs) => {
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

    const connConfig = {
      uri: config.uri,
      mongopts: { useMongoClient: true, ...config.options },
      conn: undefined,
      async getConn() {
        if (!this.conn) {
          this.conn = await mongoose.createConnection(this.uri, this.mongopts);
        }
        return this.conn;
      }
    };

    const namespace = multiConns ? config.namespace : '';
    const schemas = config.schemas.endsWith('/') ? config.schemas : `${config.schemas}/`;
    const files = glob.sync(`${schemas}**/*.js`);

    files.forEach((file) => {
      const baseName = path.basename(file, '.js');
      const modelName = multiConns ? `${namespace}/${baseName}` : baseName;
      if (Object.hasOwnProperty.call(modelList, modelName)) {
        throw TypeError(`error, multiple definitions of model ${modelName}`);
      }

      const schema = require(file);
      if (typeof schema !== 'function') {
        throw TypeError('schema definition must be a function');
      }

      modelList[modelName] = {
        conn: undefined,
        model: undefined,
        async getModel() {
          if (!this.model) {
            if (!this.conn) {
              this.conn = await connConfig.getConn();
            }
            this.model = this.conn.model(baseName, schema());
          }

          return this.model;
        }
      };
    });
  });

  return {
    Model: name => modelList[name].getModel(),

    Document: async (name, obj) => {
      const Model = await modelList[name].getModel();
      return new Model(obj);
    },

    Middleware: (ctx, next) => {
      ctx.model = name => modelList[name].getModel();
      ctx.document = async (name, obj) => {
        const Model = await modelList[name].getModel();
        return new Model(obj);
      };

      return next();
    }
  };
};
