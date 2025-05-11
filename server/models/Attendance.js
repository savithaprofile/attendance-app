//server/models/Attendance.js
const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['check-in', 'check-out'] },
  location: String,
  isInOffice: { type: Boolean, default: true },
  image: String,
  timestamp: Date,
});
module.exports = mongoose.model('Attendance', AttendanceSchema);