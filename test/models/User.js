const mongoose = require('mongoose');
const { idGenerator } = require('../../index');

module.exports = () => {
  const schema = new mongoose.Schema({
    id: { type: String, unique: true, default: idGenerator },
    username: { type: String, required: true, unique: true },
    groupNames: [String]
  }, { usePushEach: true });

  schema.virtual('groups', {
    ref: 'Group',
    localField: 'groupNames',
    foreignField: 'groupname',
    justOne: false,
  });

  return schema;
};
