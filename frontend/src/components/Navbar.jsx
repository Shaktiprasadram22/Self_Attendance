import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AppDataContext } from '../App';

const NavItem = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `text-sm font-semibold px-3 py-1.5 rounded-full transition-colors duration-150 ${
        isActive
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`
    }
  >
    {label}
  </NavLink>
);

export default function Navbar() {
  const { user, logout, sessionExpired } = useContext(AppDataContext);

  return (
    <header className="fixed inset-x-0 top-0 z-10 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-base font-semibold text-slate-900">Self Attendance</Link>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-2 sm:flex" aria-label="Main navigation">
            <NavItem to="/" label="Home" />
            <NavItem to="/subjects" label="Subjects" />
            <NavItem to="/todos" label="Todos" />
          </nav>
          {user && sessionExpired ? (
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-700">Sign in again</Link>
          ) : user ? (
            <button
              onClick={logout}
              className="min-h-11 text-sm font-semibold px-3 py-1.5 rounded-full text-slate-600 transition-colors duration-150 hover:text-slate-900 hover:bg-slate-100"
            >
              Logout
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center text-sm font-semibold px-3 py-1.5 rounded-full transition-colors duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                  }`
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center text-sm font-semibold px-3 py-1.5 rounded-full transition-colors duration-150 ${
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-brand text-white hover:bg-brand/90'
                  }`
                }
              >
                Sign up
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
