# Yet Another Mongoose Middleware for Koa

A mongoose middleware for koa.

# Models

Models are defined in mongoose syntax, schema returned by custom function.

## Model define

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

**Note: Model file names ARE CASE SENSITIVE!!!**

# Using Middleware in Koa

```js
const Koa = require('koa');
const Mongoose = require('./index');
const app = new Koa();

//options for mongoose, can be omitted
const options = {
  useMongoClient: true,   //default is true
  poolSize: 10,
},

const config = {
  uri: 'mongodb://localhost/db',
  schemas: './models',
  options,  //OK to omit
}

app.use(Mongoose(config).Middleware);

app.use(async (ctx, next) => {
  //single connection
  const User = ctx.model('User');
  //multiple connections, note how namespace is used
  const User = ctx.model('local/User');
  const user = new User({ username: 'Alice' });
  //or with ctx.document
  const user = ctx.document('User', { username: 'Alice' });
  this.ctx.body = await user.saveWithPassword('myverysecretpassword');
})

//listen & run ...
```

# Remarks

* If restful URL is needed, have a look at [YARMK](https://github.com/neilzheng/yarmk).

# License

  MIT
