const Todo = require('../models/todoModel');

function toDto(todo) {
  return {
    id: todo._id.toString(),
    title: todo.title,
    completed: !!todo.completed,
    dueAt: todo.dueAt ? todo.dueAt.toISOString() : null,
  };
}

function parseDueAt(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid dueAt');
    error.statusCode = 400;
    throw error;
  }
  return date;
}

exports.list = async (req, res) => {
  try {
    const items = await Todo.find({ user: req.user._id }).sort({ createdAt: 1 }).lean();
    res.json(items.map(toDto));
  } catch (err) {
    console.error('Todo list error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const completed = req.body?.completed ? !!req.body.completed : false;
    let dueAt = null;
    try {
      dueAt = parseDueAt(req.body?.dueAt);
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({ message: err.message || 'Invalid dueAt' });
    }
    const todo = await Todo.create({ user: req.user._id, title, completed, dueAt });
    res.status(201).json(toDto(todo));
  } catch (err) {
    console.error('Todo create error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = {};
    if (typeof req.body?.title === 'string') {
      const title = req.body.title.trim();
      if (!title) return res.status(400).json({ message: 'Title is required' });
      updates.title = title;
    }
    if (typeof req.body?.completed !== 'undefined') {
      updates.completed = !!req.body.completed;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'dueAt')) {
      try {
        const parsed = parseDueAt(req.body.dueAt);
        updates.dueAt = parsed;
      } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ message: err.message || 'Invalid dueAt' });
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }
    const todo = await Todo.findOneAndUpdate({ _id: id, user: req.user._id }, updates, { new: true });
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    res.json(toDto(todo));
  } catch (err) {
    console.error('Todo update error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Todo.deleteOne({ _id: id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Todo not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Todo delete error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
