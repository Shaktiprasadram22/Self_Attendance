import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppDataContext } from '../App';

function formatDuration(ms) {
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);
  return parts.slice(0, 2).join(' ');
}

function describeRemaining(dueAtIso, nowMs) {
  if (!dueAtIso) return { text: 'No end time set', tone: 'muted', hasDue: false };
  const dueMs = new Date(dueAtIso).getTime();
  if (Number.isNaN(dueMs)) return { text: 'End time unavailable', tone: 'muted', hasDue: false };
  const diff = dueMs - nowMs;
  const formatted = formatDuration(diff);
  if (diff >= 0) {
    let tone = 'positive';
    if (diff <= 5 * 60 * 1000) tone = 'warning';
    return { text: `${formatted} left`, tone, hasDue: true };
  }
  return { text: `Overdue by ${formatted}`, tone: 'negative', hasDue: true };
}

export default function Todos() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useContext(AppDataContext);
  const [title, setTitle] = useState('');
  const [dueAtInput, setDueAtInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem('todoNotes') || '';
    } catch {
      return '';
    }
  });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const todoListRef = useRef(null);
  const dueInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('todoNotes', notes);
    } catch {
      // ignore storage write failures
    }
  }, [notes]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const remainingCount = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError('');
    let dueAtIso = null;
    if (dueAtInput) {
      const candidate = new Date(dueAtInput);
      if (Number.isNaN(candidate.getTime())) {
        setError('Enter a valid end time.');
        setSubmitting(false);
        return;
      }
      dueAtIso = candidate.toISOString();
    }
    const created = await addTodo(trimmed, dueAtIso);
    if (!created) {
      setError('Unable to add todo right now. Please try again.');
    } else {
      setTitle('');
      setDueAtInput('');
    }
    setSubmitting(false);
  };

  const handleDueChange = (event) => {
    setDueAtInput(event.target.value);
    if (todoListRef.current) {
      todoListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      todoListRef.current.classList.add('ring-4', 'ring-brand/30', 'shadow-lg');
      setTimeout(() => {
        if (todoListRef.current) {
          todoListRef.current.classList.remove('ring-4', 'ring-brand/30', 'shadow-lg');
        }
      }, 600);
    }
  };

  const handleToggle = async (id, completed) => {
    await toggleTodo(id, completed);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this todo?');
    if (!confirmed) return;
    await deleteTodo(id);
  };

  return (
    <div className="space-y-6 scroll-smooth">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a todo"
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              disabled={submitting}
            />
            <button
              type="submit"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              Add
            </button>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ending time</label>
            <input
              type="datetime-local"
              value={dueAtInput}
              onChange={handleDueChange}
              ref={dueInputRef}
              className="mt-1 w-full appearance-none rounded-full border-2 border-brand/30 bg-gradient-to-r from-white via-slate-100 to-white px-5 py-3 text-sm font-medium text-slate-700 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.65)] transition focus:border-brand focus:bg-white focus:text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand/20"
              style={{
                scrollbarWidth: 'thin',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </section>

      <section ref={todoListRef} className="space-y-3 rounded-2xl border border-transparent bg-gradient-to-b from-white/60 to-white/20 p-1">
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Todos</h2>
          <span className="text-sm text-slate-500">{remainingCount} remaining</span>
        </header>
        <div className="space-y-2">
          {todos.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-100 py-6 text-center text-sm text-slate-500">
              Nothing here yet. Add your first todo above.
            </div>
          )}
          {todos.map((todo) => {
            const remainingInfo = describeRemaining(todo.dueAt, nowMs);
            return (
              <article
                key={todo.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm"
              >
                <label className="flex flex-1 items-center gap-3">
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={!!todo.completed}
                      onChange={(event) => handleToggle(todo.id, event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-lg border border-slate-300 bg-white transition peer-checked:border-brand peer-checked:bg-brand/10 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5 text-brand opacity-0 transition peer-checked:opacity-100"
                      aria-hidden="true"
                    >
                      <path
                        d="M8.143 13.314l-2.95-2.95a.75.75 0 10-1.06 1.061l3.48 3.48a.75.75 0 001.06 0l7.056-7.056a.75.75 0 10-1.06-1.06l-6.526 6.525z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span
                      className={`text-sm ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                    >
                      {todo.title}
                    </span>
                    {todo.dueAt ? (
                      <span className="text-xs text-slate-500">
                        Ends {new Date(todo.dueAt).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No end time set</span>
                    )}
                    {remainingInfo.hasDue && (
                      <span
                        className={`mt-1 inline-flex min-w-[6rem] items-center justify-center rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${(() => {
                          const tone = remainingInfo.tone;
                          if (tone === 'negative') return 'border-rose-300 text-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.15)]';
                          if (tone === 'warning') return 'border-amber-300 text-amber-600 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]';
                          if (tone === 'positive') return 'border-emerald-300 text-emerald-600 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]';
                          return 'border-slate-200 text-slate-500';
                        })()}`}
                        style={{ transition: 'transform 200ms ease, box-shadow 200ms ease' }}
                      >
                        {remainingInfo.text}
                      </span>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleDelete(todo.id)}
                >
                  Delete
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Notes</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">Personal notepad</span>
        </header>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Jot down anything important..."
          className="h-40 w-full resize-none rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-inner focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </section>
    </div>
  );
}
