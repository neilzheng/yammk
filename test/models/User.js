const mongoose = require('mongoose');
const { idGenerator } = require('../../index');

module.exports = () => new mongoose.Schema({
  id: { type: String, unique: true, default: idGenerator },
  username: { type: String, required: true, unique: true },
  groups: [String]
}, { usePushEach: true });
