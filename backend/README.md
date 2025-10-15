# Self Attendance App — MVP Version

The Self Attendance App is a mobile-first tool that lets users manually track their attendance. You can add subjects, mark your daily status (Present, Absent, Holiday, Sick Leave, Half Day), and instantly view subject-wise and overall attendance percentages.

## Frontend (React + Tailwind)
- Optimized for phone and iPad only.
- Uses local storage for attendance data.
- Components: SubjectCard, AttendanceForm, StatsDashboard, Navbar.

## Backend (Node.js + Express + MongoDB)
- Structured for future features.
- Connects to MongoDB using the provided URI.
- Includes routes, controllers, and models placeholders.

## Core Features
1. Add/Edit/Delete subjects  
2. Mark daily attendance  
3. Bulk select subjects  
4. View subject-wise & total percentage  
5. Responsive design (Mobile-first)  

---

## Getting Started (Backend)

- Prerequisites: Node.js 18+
- Create `.env` (already included):

```
MONGO_URI=<your mongo connection string>
PORT=5000
```

- Install deps:

```bash
npm install
```

- Start dev server:

```bash
npm run dev
```

Note: For the MVP, the frontend stores data locally in the browser. The backend is scaffolded for future features and currently exposes placeholder endpoints under `/api/attendance`.
