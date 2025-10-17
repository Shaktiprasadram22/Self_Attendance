const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    dueAt: { type: Date },
  },
  { timestamps: true }
);

TodoSchema.index({ user: 1, title: 1 });

module.exports = mongoose.model('Todo', TodoSchema);
