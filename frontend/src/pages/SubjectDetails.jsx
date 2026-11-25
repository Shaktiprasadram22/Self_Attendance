import React, { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppDataContext } from '../App';

const STATUSES = ['Present', 'Absent', 'Holiday', 'Sick Leave', 'Half Day'];

export default function SubjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { subjects, attendance, markAttendance, clearAttendance, canEdit } = useContext(AppDataContext);

  const subject = useMemo(() => subjects.find((s) => s.id === id), [subjects, id]);

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
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

  const saveEdit = async () => {
    if (!editingDate) return;
    setSaved(false);
    if (!await markAttendance(editingDate, [id], editingStatus)) return;
    setEditingDate(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const clearDay = (d) => {
    const ok = window.confirm('Clear attendance for this day?');
    if (ok) clearAttendance(d, id);
  };

  const quickSet = async (e) => {
    e.preventDefault();
    if (!date) return;
    setSaved(false);
    if (!await markAttendance(date, [id], status)) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  if (!subject) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">{canEdit ? 'Subject not found.' : 'Load your saved subjects to view this history.'}</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-brand underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="break-words text-base font-semibold text-slate-900">{subject.name}</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-800 mb-2">Set attendance for a date</h2>
        <form onSubmit={quickSet} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="subject-date" className="text-sm text-slate-600">Date</label>
            <input
              id="subject-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="subject-status" className="text-sm text-slate-600">Status</label>
            <select
              id="subject-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Link
            to="/subjects"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 text-center hover:border-slate-400"
          >
            Back
          </Link>
          <button disabled={!canEdit} type="submit" className="w-full rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50">Save</button>
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full text-sm text-slate-700">
                    {new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <select
                    aria-label={`Attendance on ${row.date}`}
                    value={editingStatus}
                    onChange={(e) => setEditingStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button disabled={!canEdit} onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50">Save</button>
                  <button onClick={() => setEditingDate(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">Status: {row.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={!canEdit} onClick={() => startEdit(row.date, row.status)} className="text-sm text-slate-700 underline disabled:opacity-50">Edit</button>
                    <button disabled={!canEdit} onClick={() => clearDay(row.date)} className="text-sm text-red-600 underline disabled:opacity-50">Clear</button>
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
