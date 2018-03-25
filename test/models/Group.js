const mongoose = require('mongoose');
const { idGenerator } = require('../../index');

module.exports = () => new mongoose.Schema({
  id: { type: String, unique: true, default: idGenerator },
  groupname: { type: String, required: true, unique: true }
}, { usePushEach: true });
