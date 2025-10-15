import React, { useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppDataContext } from '../App';
import CircularProgress from './CircularProgress';

function computeSubjectStats(subjectId, attendance) {
  let present = 0;
  let total = 0;
  for (const date of Object.keys(attendance)) {
    const status = attendance[date]?.[subjectId];
    if (!status) continue;
    if (status === 'Present') {
      present += 1;
      total += 1;
    } else if (status === 'Absent') {
      total += 1;
    } else if (status === 'Half Day') {
      present += 0.5;
      total += 1;
    }
  }
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { present, total, pct };
}

export default function StatsDashboard() {
  const { subjects, attendance } = useContext(AppDataContext);

  const stats = useMemo(() => {
    const bySubject = subjects.map((s) => {
      const st = computeSubjectStats(s.id, attendance);
      return { id: s.id, name: s.name, ...st };
    });
    const aggregate = bySubject.reduce(
      (acc, s) => {
        acc.present += s.present;
        acc.total += s.total;
        return acc;
      },
      { present: 0, total: 0 }
    );
    const overallPct = aggregate.total > 0 ? Math.round((aggregate.present / aggregate.total) * 100) : 0;
    return { bySubject, overallPct, aggregate };
  }, [subjects, attendance]);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Overview</h2>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Overall attendance</p>
            <p className="mt-1 text-xs text-slate-500">{stats.aggregate.present} / {stats.aggregate.total} days</p>
          </div>
          <CircularProgress value={stats.overallPct} size={64} stroke={6} threshold={75} />
        </div>
      </div>

      {stats.bySubject.length === 0 ? (
        <p className="text-sm text-slate-500">No subjects to show.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          {stats.bySubject.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 ${
                idx !== stats.bySubject.length - 1 ? 'border-b border-slate-200' : ''
              }`}
            >
              <div>
                <Link to={`/subjects/${s.id}`} className="text-sm font-medium text-slate-900 underline decoration-slate-300">
                  {s.name}
                </Link>
                <div className="text-xs text-slate-500">{s.present} / {s.total} days</div>
              </div>
              <div className="shrink-0">
                <CircularProgress value={s.pct} size={48} stroke={6} threshold={75} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
