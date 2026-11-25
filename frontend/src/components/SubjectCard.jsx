import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SubjectCard({ subject, onEdit, onDelete, disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (await onEdit(subject.id, trimmed)) setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      {editing ? (
        <input
          value={name}
          aria-label="Subject name"
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoFocus
        />
      ) : (
        <Link to={`/subjects/${subject.id}`} className="min-w-0 flex-1 break-words font-semibold text-slate-900">
          {subject.name}
        </Link>
      )}
      {editing ? (
        <div className="flex items-center gap-2">
          <button disabled={disabled} onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button disabled={disabled} onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">
            Edit
          </button>
          <button
            disabled={disabled}
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
