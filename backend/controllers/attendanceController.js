const mongoose = require('mongoose');
const { Attendance, Subject } = require('../models/attendanceModel');

exports.healthCheck = (req, res) => {
  res.json({ ok: true, message: 'Attendance route healthy' });
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, dates, subjectIds, status } = req.body || {};
    if ((!date && !Array.isArray(dates)) || !Array.isArray(subjectIds) || !status)
      return res.status(400).json({ message: 'date(s), subjectIds and status are required' });

    const dateList = Array.isArray(dates) ? dates : [date];
    // Validate subject ownership
    const allowed = await Subject.find({ user: req.user._id, _id: { $in: subjectIds } }).select('_id').lean();
    const allowedIds = new Set(allowed.map((s) => s._id.toString()));
    const ops = [];
    for (const d of dateList) {
      for (const sid of subjectIds) {
        if (!allowedIds.has(sid.toString())) continue;
        ops.push({
          updateOne: {
            filter: { user: req.user._id, subject: new mongoose.Types.ObjectId(sid), date: d },
            update: { $set: { status, date: d } },
            upsert: true,
          },
        });
      }
    }
    if (ops.length === 0) return res.status(400).json({ message: 'No valid subject IDs' });
    const result = await Attendance.bulkWrite(ops);
    return res.json({ ok: true, upserted: result.upsertedCount || 0, modified: result.modifiedCount || 0 });
  } catch (err) {
    console.error('markAttendance error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.clearOne = async (req, res) => {
  try {
    const { date, subjectId } = req.query;
    if (!date || !subjectId) return res.status(400).json({ message: 'date and subjectId are required' });
    const del = await Attendance.deleteOne({ user: req.user._id, date, subject: subjectId });
    if (!del.deletedCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('clearOne error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const rows = await Attendance.find({ user: req.user._id }).select('date subject status').lean();
    const out = {};
    for (const r of rows) {
      const d = r.date;
      if (!out[d]) out[d] = {};
      out[d][r.subject.toString()] = r.status;
    }
    return res.json(out);
  } catch (err) {
    console.error('getAll error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
