import React, { useContext, useMemo, useState } from 'react';
import { AppDataContext } from '../App';

const STATUSES = ['Present', 'Absent', 'Holiday', 'Sick Leave', 'Half Day'];

// Helpers for calendar
function pad2(n) {
  return n.toString().padStart(2, '0');
}
function ymdFromParts(y, mIndex, d) {
  // mIndex is 0-11
  return `${y}-${pad2(mIndex + 1)}-${pad2(d)}`;
}
function daysInMonth(y, mIndex) {
  return new Date(y, mIndex + 1, 0).getDate();
}

export default function AttendanceForm() {
  const { subjects, attendance, markAttendance } = useContext(AppDataContext);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const now = useMemo(() => new Date(), []);
  const [dates, setDates] = useState(() => new Set());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-11
  const [selected, setSelected] = useState(() => new Set());
  const [status, setStatus] = useState('Present');
  const [saved, setSaved] = useState(false);

  const allSelected = subjects.length > 0 && selected.size === subjects.length;

  // Aggregate a day's overall status across all subjects for calendar coloring
  const dayTone = (ymd) => {
    const day = attendance[ymd] || {};
    const total = subjects.length;
    if (total === 0) return null;
    let present = 0, absent = 0, half = 0, other = 0, marked = 0;
    subjects.forEach((s) => {
      const st = day[s.id];
      if (!st) return;
      marked += 1;
      if (st === 'Present') present += 1;
      else if (st === 'Absent') absent += 1;
      else if (st === 'Half Day') half += 1;
      else if (st === 'Holiday' || st === 'Sick Leave') other += 1;
    });
    if (marked === 0) return null; // nothing marked
    if (present === total) return 'green';
    if (absent === total) return 'red';
    if (other > 0 || half > 0) return 'yellow'; // any special day present
    // Otherwise: partial coverage or mix of present/absent -> orange
    return 'orange';
  };

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === subjects.length) return new Set();
      return new Set(subjects.map((s) => s.id));
    });
  };


  const onSubmit = async (e) => {
    e.preventDefault();
    const ids = Array.from(selected);
    const datesToSave = Array.from(dates);
    if (ids.length === 0 || datesToSave.length === 0) return;
    // Mark all selected dates in one call
    await Promise.resolve(markAttendance(datesToSave.sort(), ids, status));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mark attendance</h2>
        <button
          type="button"
          onClick={() => {
            if (subjects.length === 0) return;
            const todayYmd = new Date().toISOString().slice(0, 10);
            markAttendance(
              todayYmd,
              subjects.map((s) => s.id),
              'Present'
            );
          }}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          disabled={subjects.length === 0}
        >
          Mark all Present Today
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        {/* Calendar multi-select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setViewMonth((m) => {
                  if (m === 0) {
                    setViewYear((y) => y - 1);
                    return 11;
                  }
                  return m - 1;
                });
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
              aria-label="Previous month"
            >
              ◀
            </button>
            <div className="text-sm font-medium">
              {new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMonth((m) => {
                  if (m === 11) {
                    setViewYear((y) => y + 1);
                    return 0;
                  }
                  return m + 1;
                });
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
              aria-label="Next month"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
            {['S','M','T','W','T','F','S'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {(() => {
            const first = new Date(viewYear, viewMonth, 1).getDay();
            const dim = daysInMonth(viewYear, viewMonth);
            const cells = [];
            const total = 42; // 6 weeks
            for (let i = 0; i < total; i += 1) {
              const dayNum = i - first + 1;
              if (dayNum < 1 || dayNum > dim) {
                cells.push(<div key={`e-${i}`} className="h-10" />);
              } else {
                const ymd = ymdFromParts(viewYear, viewMonth, dayNum);
                const isSelected = dates.has(ymd);
                const tone = dayTone(ymd);
                const toneCls = tone === 'green'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : tone === 'red'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : tone === 'yellow'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                  : tone === 'orange'
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-white text-slate-700 border-slate-300';
                cells.push(
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => {
                      setDates((prev) => {
                        const n = new Set(prev);
                        if (n.has(ymd)) n.delete(ymd);
                        else n.add(ymd);
                        return n;
                      });
                    }}
                    className={`h-10 w-full rounded-md border text-sm ${
                      isSelected ? 'bg-slate-900 text-white border-slate-900' : toneCls
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              }
            }
            return <div className="grid grid-cols-7 gap-1">{cells}</div>;
          })()}

          {dates.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">Selected: {dates.size}</span>
              <button
                type="button"
                className="text-xs text-brand underline"
                onClick={() => setDates(new Set())}
              >
                Clear all
              </button>
            </div>
          )}
          {/* Legend */}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-500" /> All Present</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-500" /> All Absent</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-yellow-400" /> Holiday/Sick/Half</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-400" /> Partial/Unmarked</span>
          </div>
        </div>

        {/* Status */}
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

        {/* Subjects */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-700">Subjects</h3>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={subjects.length === 0}
                className="size-4 accent-brand"
              />
              <span>Select all</span>
            </label>
          </div>
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-500">No subjects yet. Add some from the Subjects tab.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="size-4 accent-brand"
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={subjects.length === 0 || selected.size === 0 || dates.size === 0}
          className="w-full rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        {saved && <p className="text-center text-sm text-emerald-600">Saved!</p>}
      </form>
    </section>
  );
}
