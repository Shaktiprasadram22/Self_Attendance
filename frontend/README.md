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

## Getting Started (Frontend)

- Prerequisites: Node.js 18+
- Install deps:

```bash
npm install
```

- Start dev server:

```bash
npm start
```

This project uses Create React App with Tailwind CSS (via PostCSS). All data is stored locally in the browser (no backend required for the MVP).
