const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
SubjectSchema.index({ user: 1, name: 1 }, { unique: true });

const AttendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Holiday', 'Sick Leave', 'Half Day'],
      required: true,
    },
  },
  { timestamps: true }
);
AttendanceSchema.index({ user: 1, subject: 1, date: 1 }, { unique: true });

const Subject = mongoose.model('Subject', SubjectSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = { Subject, Attendance };
