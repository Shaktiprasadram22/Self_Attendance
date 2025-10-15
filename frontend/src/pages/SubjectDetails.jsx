import React, { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppDataContext } from '../App';

const STATUSES = ['Present', 'Absent', 'Holiday', 'Sick Leave', 'Half Day'];

export default function SubjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subjects, attendance, markAttendance, clearAttendance } = useContext(AppDataContext);

  const subject = useMemo(() => subjects.find((s) => s.id === id), [subjects, id]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('Present');
  const [saved, setSaved] = useState(false);

  const entries = useMemo(() => {
    const out = [];
    for (const d of Object.keys(attendance)) {
      const st = attendance[d]?.[id];
      if (st) out.push({ date: d, status: st });
    }
    out.sort((a, b) => (a.date < b.date ? 1 : -1));
    return out;
  }, [attendance, id]);

  const [editingDate, setEditingDate] = useState(null);
  const [editingStatus, setEditingStatus] = useState('Present');

  const startEdit = (d, current) => {
    setEditingDate(d);
    setEditingStatus(current);
  };

  const saveEdit = () => {
    if (!editingDate) return;
    markAttendance(editingDate, [id], editingStatus);
    setEditingDate(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const clearDay = (d) => {
    const ok = window.confirm('Clear attendance for this day?');
    if (ok) clearAttendance(d, id);
  };

  const quickSet = (e) => {
    e.preventDefault();
    if (!date) return;
    markAttendance(date, [id], status);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  if (!subject) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">Subject not found.</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-brand underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/subjects" className="text-sm text-slate-700 underline">Back</Link>
        <h1 className="text-base font-semibold">{subject.name}</h1>
        <div />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-800 mb-2">Set attendance for a date</h2>
        <form onSubmit={quickSet} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full rounded-xl bg-brand px-4 py-2 font-semibold text-white">Save</button>
          {saved && <p className="text-center text-sm text-emerald-600">Saved!</p>}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-800">History</h2>
          <span className="text-xs text-slate-500">{entries.length} days</span>
        </div>
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No attendance yet for this subject.</div>
        ) : (
          entries.map((row, idx) => (
            <div key={row.date} className={`px-4 py-3 ${idx !== entries.length - 1 ? 'border-b border-slate-200' : ''}`}>
              {editingDate === row.date ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm text-slate-700">
                    {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <select
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium">Save</button>
                  <button onClick={() => setEditingDate(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">Status: {row.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(row.date, row.status)} className="text-sm text-slate-700 underline">Edit</button>
                    <button onClick={() => clearDay(row.date)} className="text-sm text-red-600 underline">Clear</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
