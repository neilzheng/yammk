const path = require('path');

module.exports.singleConn = {
  uri: 'mongodb://127.0.0.1/testyammk',
  schemas: path.join(__dirname, './models')
};

module.exports.multiConn = [{
  namespace: 'test1',
  uri: 'mongodb://127.0.0.1/testyammk1',
  schemas: path.join(__dirname, './models')
}, {
  namespace: 'test2',
  uri: 'mongodb://127.0.0.1/testyammk2',
  schemas: path.join(__dirname, './models')
}];
