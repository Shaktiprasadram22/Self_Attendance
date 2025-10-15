import React, { useContext } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AppDataContext } from '../App';

const NavItem = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `text-sm font-medium ${isActive ? 'text-slate-900 underline' : 'text-slate-700'}`
    }
  >
    {label}
  </NavLink>
);

export default function Navbar() {
  const { user, logout } = useContext(AppDataContext);

  return (
    <header className="fixed inset-x-0 top-0 z-10 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-base font-semibold text-slate-900">Self Attendance</Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-3">
            <NavItem to="/" label="Home" />
            <NavItem to="/subjects" label="Subjects" />
          </nav>
          {user ? (
            <button onClick={logout} className="text-sm text-slate-700 underline">Logout</button>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink to="/login" className="text-sm text-slate-700 underline">Login</NavLink>
              <NavLink to="/signup" className="text-sm text-slate-700 underline">Sign up</NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
