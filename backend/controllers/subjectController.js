const { Subject, Attendance } = require('../models/attendanceModel');

exports.list = async (req, res) => {
  try {
    const items = await Subject.find({ user: req.user._id }).sort({ createdAt: 1 }).lean();
    res.json(items.map((s) => ({ id: s._id.toString(), name: s.name })));
  } catch (err) {
    console.error('Subjects list error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const s = await Subject.create({ user: req.user._id, name });
    res.status(201).json({ id: s._id.toString(), name: s.name });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: 'Subject already exists' });
    console.error('Subject create error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const s = await Subject.findOneAndUpdate({ _id: id, user: req.user._id }, { name }, { new: true });
    if (!s) return res.status(404).json({ message: 'Subject not found' });
    res.json({ id: s._id.toString(), name: s.name });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: 'Subject already exists' });
    console.error('Subject update error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Subject.deleteOne({ _id: id, user: req.user._id });
    await Attendance.deleteMany({ user: req.user._id, subject: id });
    if (!deleted.deletedCount) return res.status(404).json({ message: 'Subject not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Subject delete error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
