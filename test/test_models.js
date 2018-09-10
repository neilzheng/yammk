const connConfig = require('./configs');
const Mongoose = require('../index');
const { expect } = require('chai');
const request = require('supertest');
const Koa = require('koa');

function connect() {
  return Mongoose(connConfig);
}

function Group() {
  return connect().Model('Group');
}

function User() {
  return connect().Model('User');
}

describe('user & group models', () => {
  before(async () => {
    await (await User()).remove();
    await (await Group()).remove();
  });

  it('should add group', async () => {
    const Model = await Group();
    const group = new Model({ groupname: 'testgroup' });
    const res = await group.save();
    expect(res.id).to.be.not.null;
    expect(res.groupname).to.eq('testgroup');
  });

  it('should add user', async () => {
    const Model = await User();
    const user = new Model({ username: 'testuser', groupNames: ['testgroup'] });
    const res = await user.save();
    expect(res.id).to.be.not.null;
    expect(res.username).to.eq('testuser');
    expect(res.groupNames.length).to.eq(1);
    expect(res.groupNames[0]).to.eq('testgroup');
  });

  it('should get user', async () => {
    const Model = await User();
    const user = await Model.findOne({ username: 'testuser' }).populate('groups').exec();
    expect(user.username).to.eq('testuser');
    expect(user.groups.length).to.eq(1);
    expect(user.groups[0].groupname).to.eq('testgroup');
  });

  it('should get group', async () => {
    const Model = await Group();
    const group = await Model.findOne({ groupname: 'testgroup' }).exec();
    expect(group.groupname).to.eq('testgroup');
  });

  after(async () => {
    await (await User()).remove();
    await (await Group()).remove();
  });
});

describe('middleware', () => {
  function createApp(mw) {
    const app = new Koa();
    app.use(Mongoose(connConfig).Middleware);
    app.use(mw);
    return app.listen();
  }

  before(async () => {
    await (await User()).remove();
  });

  it('should save testuser in both connections', async () => {
    const server = createApp(async (ctx, next) => {
      ctx.body = await (await ctx.document('User', { username: 'testuser', groups: ['testgroup'] })).save();
      await next();
    });

    const req = request(server);

    await req.post('/')
      .send({})
      .expect(200);

    server.close();
  });

  it('should load testuser from both connections', async () => {
    const server = createApp(async (ctx, next) => {
      ctx.body = await (await ctx.model('User')).findOne({ username: 'testuser' }).exec();
      await next();
    });

    const req = request(server);

    await req.get('/')
      .send({})
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data.username).to.eq('testuser');
      });

    server.close();
  });

  after(async () => {
    await (await User()).remove();
  });
});
