const mongoose = require('mongoose');

module.exports = () => new mongoose.Schema({
  groupname: { type: String, required: true, unique: true }
}, { usePushEach: true });
