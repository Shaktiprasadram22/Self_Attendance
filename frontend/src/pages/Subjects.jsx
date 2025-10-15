import React, { useContext, useMemo, useState } from 'react';
import { AppDataContext } from '../App';
import SubjectCard from '../components/SubjectCard';

export default function Subjects() {
  const { subjects, addSubject, editSubject, deleteSubject } = useContext(AppDataContext);
  const [name, setName] = useState('');
  const isDuplicate = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return subjects.some((s) => s.name.toLowerCase() === trimmed);
  }, [name, subjects]);

  const add = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isDuplicate) return;
    addSubject(trimmed);
    setName('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Add subject</label>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Math"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!name.trim() || isDuplicate}
          >
            Add
          </button>
        </div>
        {isDuplicate && (
          <p className="mt-2 text-xs text-red-600">Subject already exists.</p>
        )}
      </form>

      <div className="grid grid-cols-1 gap-3">
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">No subjects yet.</p>
        ) : (
          subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onEdit={editSubject}
              onDelete={deleteSubject}
            />
          ))
        )}
      </div>
    </div>
  );
}
