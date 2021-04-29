const glob = require('glob');
const path = require('path');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = (configs) => {
  if (typeof configs !== 'object') throw TypeError('configs must be an object');

  if (!configs.uri) throw TypeError('uri is needed to connect to mongodb server');
  if (!configs.schemas) throw TypeError('schemas needed for defining models');

  const { uri } = configs;
  const mongopts = {
    useCreateIndex: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
    ...configs.options
  };
  let dbConn;
  const modelList = {};
  const schemaList = {};

  const schemasDir = configs.schemas.endsWith('/') ? configs.schemas : `${configs.schemas}/`;
  const files = glob.sync(`${schemasDir}**/*.js`);

  files.forEach((file) => {
    const modelName = path.basename(file, '.js');
    if (Object.hasOwnProperty.call(modelList, modelName)) {
      throw TypeError(`error, multiple definitions of model ${modelName}`);
    }

    const schema = require(file);
    if (typeof schema !== 'function') {
      throw TypeError('schema definition must be a function');
    }

    schemaList[modelName] = schema;
  });

  const getModel = async (name) => {
    if (!dbConn) {
      dbConn = await mongoose.createConnection(uri, mongopts);

      Object.entries(schemaList).forEach((item) => {
        const key = item[0];
        const val = item[1];
        modelList[key] = dbConn.model(key, val.call());
      });
    }

    return modelList[name];
  };

  return {
    Model: getModel,

    Document: async (name, obj) => {
      const Model = await getModel(name);
      return new Model(obj);
    },

    Middleware: (ctx, next) => {
      ctx.model = getModel;
      ctx.document = async (name, obj) => {
        const Model = await getModel(name);
        return new Model(obj);
      };

      return next();
    }
  };
};
