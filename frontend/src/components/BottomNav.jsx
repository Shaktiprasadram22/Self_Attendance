import React from 'react';
import { NavLink } from 'react-router-dom';

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-center px-6 py-3 text-sm ${
          isActive ? 'text-brand font-semibold' : 'text-slate-600'
        }`
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-md w-full">
        <div className="grid grid-cols-2">
          <Item to="/" label="Home" />
          <Item to="/subjects" label="Subjects" />
        </div>
      </div>
    </nav>
  );
}
