import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SubjectCard({ subject, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onEdit(subject.id, trimmed);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoFocus
        />
      ) : (
        <Link to={`/subjects/${subject.id}`} className="flex-1 font-semibold text-slate-900">
          {subject.name}
        </Link>
      )}
      {editing ? (
        <div className="flex items-center gap-2">
          <button onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            Edit
          </button>
          <button
            onClick={() => {
              const ok = window.confirm(`Delete subject "${subject.name}"? This will remove its attendance records from saved days.`);
              if (ok) onDelete(subject.id);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
