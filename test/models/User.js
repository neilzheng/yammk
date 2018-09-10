const mongoose = require('mongoose');

module.exports = () => {
  const schema = new mongoose.Schema({
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
