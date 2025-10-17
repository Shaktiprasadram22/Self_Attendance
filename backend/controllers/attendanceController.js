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
    const { start, end, limit, skip } = req.query;
    const filter = { user: req.user._id };
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = start;
      if (end) filter.date.$lte = end;
    }
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 180, 1), 365);
    const parsedSkip = Math.max(parseInt(skip, 10) || 0, 0);

    const rows = await Attendance.find(filter)
      .select('date subject status')
      .sort({ date: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .lean();
    const out = {};
    for (const r of rows) {
      const d = r.date;
      if (!out[d]) out[d] = {};
      out[d][r.subject.toString()] = r.status;
    }
    const total = await Attendance.countDocuments(filter);
    return res.json({ data: out, pagination: { total, limit: parsedLimit, skip: parsedSkip, returned: rows.length } });
  } catch (err) {
    console.error('getAll error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
