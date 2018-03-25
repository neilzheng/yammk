const { singleConn, multiConn } = require('./configs');
const { Mongoose } = require('../index');
const { expect } = require('chai');
const request = require('supertest');
const Koa = require('koa');

describe('single connection with multiple models', () => {
  function connectSingle() {
    return Mongoose(singleConn);
  }

  function Group() {
    return connectSingle().Model('Group');
  }

  function User() {
    return connectSingle().Model('User');
  }

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
    const user = new Model({ username: 'testuser', groups: ['testgroup'] });
    const res = await user.save();
    expect(res.id).to.be.not.null;
    expect(res.username).to.eq('testuser');
    expect(res.groups.length).to.eq(1);
    expect(res.groups[0]).to.eq('testgroup');
  });

  it('should get user', async () => {
    const Model = await User();
    const user = await Model.findOne({ username: 'testuser' });
    expect(user.username).to.eq('testuser');
    expect(user.groups[0]).to.eq('testgroup');
  });

  it('should get group', async () => {
    const Model = await Group();
    const group = await Model.findOne({ groupname: 'testgroup' });
    expect(group.groupname).to.eq('testgroup');
  });

  after(async () => {
    await (await User()).remove();
    await (await Group()).remove();
  });
});

describe('multiple connections', () => {
  function connectMultiple() {
    return Mongoose(multiConn);
  }

  function Group1() {
    return connectMultiple().Model('test1/Group');
  }

  function Group2() {
    return connectMultiple().Model('test2/Group');
  }

  before(async () => {
    await (await Group1()).remove();
    await (await Group2()).remove();
  });

  it('should add group@conn1', async () => {
    const Model = await Group1();
    const group = new Model({ groupname: 'testgroup' });
    const res = await group.save();
    expect(res.id).to.not.be.null;
    expect(res.groupname).to.eq('testgroup');
  });

  it('should add group@conn2', async () => {
    const Model = await Group2();
    const group = new Model({ groupname: 'testgroup' });
    const res = await group.save();
    expect(res.id).to.not.be.null;
    expect(res.groupname).to.eq('testgroup');
  });

  it('should get group@conn1', async () => {
    const Model = await Group1();
    const group = await Model.findOne({ groupname: 'testgroup' });
    expect(group.groupname).to.eq('testgroup');
  });

  it('should get group@conn2', async () => {
    const Model = await Group2();
    const group = await Model.findOne({ groupname: 'testgroup' });
    expect(group.groupname).to.eq('testgroup');
  });

  after(async () => {
    await (await Group1()).remove();
    await (await Group2()).remove();
  });
});

describe('middleware', () => {
  function createApp(mw) {
    const app = new Koa();
    app.use(Mongoose(multiConn).Middleware);
    app.use(mw);
    return app.listen();
  }

  function connectMultiple() {
    return Mongoose(multiConn);
  }

  function User1() {
    return connectMultiple().Model('test1/User');
  }

  function User2() {
    return connectMultiple().Model('test2/User');
  }

  before(async () => {
    await (await User1()).remove();
    await (await User2()).remove();
  });

  it('should save testuser in both connections', async () => {
    const server = createApp(async (ctx, next) => {
      const res = [];
      res.push(await (await ctx.document('test1/User', { username: 'testuser', groups: ['testgroup'] })).save());
      res.push(await (await ctx.document('test2/User', { username: 'testuser', groups: ['testgroup'] })).save());
      ctx.body = res;
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
      const res = [];
      res.push(await (await ctx.model('test1/User')).findOne({ username: 'testuser' }));
      res.push(await (await ctx.model('test2/User')).findOne({ username: 'testuser' }));
      ctx.body = res;
      await next();
    });

    const req = request(server);

    await req.get('/')
      .send({})
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data.length).to.eq(2);
        expect(data[0].username).to.eq('testuser');
        expect(data[1].username).to.eq('testuser');
      });

    server.close();
  });

  after(async () => {
    await (await User1()).remove();
    await (await User2()).remove();
  });
});
