# yammk

Yet Another Mongoose Middleware for Koa

##Models

Models is defined in mongoose syntax, simple model is a object describing the schema, an advanced one can be defined by custom function.

# Simple Object

Post model.

```js
module.exports = {
  content: String,
  author_id: String,
};
```
# Advanced model

User model with bcrypt password support and reference to Post model as virtual properties.

```js
/* User.js */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { idGenerator } = require('../index');

module.exports = () => {
  const schema = new mongoose.Schema({
    id: { type: String, unique: true, default: idGenerator },
    username: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: true,
    },
  }, { toJSON: { virtuals: true } });

  schema.virtual('posts', {
    ref: 'Post',
    localField: 'id',
    foreignField: 'author_id',
    justOne: false,
  });

  schema.methods.saveWithPassword = async function (password) {
    this.password = await bcrypt.hash(password, 10);
    return this.save();
  };

  schema.statics.authPassword = async function (username, password) {
    const user = await this.findOne({ username });
    if (!user) return false;
    if (await bcrypt.compare(password, user.password)) {
      return user;
    }
    return false;
  };

  return schema;
};
```
## Using Middleware in Koa

```js
const Koa = require('koa');
const MO = require('./index').mongoose;
const app = new Koa();

//options for mongoose, can be omitted
const options = {
  useMongoClient: true,
  poolSize: 10,
},

const config = {
  uri: 'mongodb://localhost/db',
  schemas: './models',
  options,  //OK to omit
}
//or multiple connections
const config = [{
  namespace: 'local',
  uri: 'mongodb://localhost/db',
  schemas: './schemas',
}, {
  namespace: 'remote',
  uri: 'mongodb://username:password@remote-mongo-host.com/db',
  schemas: './schemas2',  //'./schemas' can be reused here
  options,
}];

app.use(MO(config));

app.use(async (ctx, next) => {
  //single connection
  const User = ctx.model('User');
  //multiple connections, note how namespace is used
  const User = ctx.model('local/User');
  const user = new User({ username: 'Alice' });
  //or with ctx.document
  const user = ctx.document('User');
  this.ctx.body = await user.saveWithPassword('myverysecretpassword');
})

//listen & run ...
```

## Suggested usage for microservices:

* Make microservices.
* Use single connection in one service.
* If restful URL is needed, have a look at [YARMK](https://github.com/neilzheng/yarmk).

## License

  MIT
