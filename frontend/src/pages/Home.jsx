import React, { useContext } from 'react';
import AttendanceForm from '../components/AttendanceForm';
import StatsDashboard from '../components/StatsDashboard';
import { AppDataContext } from '../App';
import { Link } from 'react-router-dom';

export default function Home() {
  const { subjects } = useContext(AppDataContext);
  const hasSubjects = subjects.length > 0;

  return (
    <div className="space-y-6">
      {!hasSubjects && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No subjects yet. Go to{' '}
          <Link className="font-semibold underline" to="/subjects">
            Subjects
          </Link>
          .
        </div>
      )}
      <AttendanceForm />
      <StatsDashboard />
    </div>
  );
}
