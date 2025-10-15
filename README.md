# Self Attendance App

A mobile-first attendance tracking solution with a React + Tailwind frontend and a Node.js + Express + MongoDB backend. Users can manage subjects, mark attendance, and optionally sync data with the backend via JWT-based authentication.

## Project Structure

```
Self attendance app/
├── backend/
│   ├── controllers/
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   └── subjectController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── attendanceModel.js
│   │   └── userModel.js
│   ├── routes/
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   └── subjectRoutes.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── package-lock.json
└── .gitignore
```

## Backend Overview (`backend/`)
- **`server.js`**: Bootstraps Express, connects to MongoDB (`MONGO_URI`), and mounts API routes at `/api/*`.
- **`controllers/`**: Request handlers for business logic.
  - `attendanceController.js`: mark, fetch, and clear attendance records.
  - `authController.js`: user signup/login/JWT token issuance.
  - `subjectController.js`: CRUD operations for subjects.
- **`middleware/auth.js`**: Validates JWT tokens and injects the authenticated user into the request object.
- **`models/`**: Mongoose schemas for `User` and attendance data.
- **`routes/`**: Express routers grouping endpoints (attendance, auth, subjects).
- **Dependencies** (see `backend/package.json`): `express`, `mongoose`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs`, plus `nodemon` for development.

### API Flow
1. Client authenticates via `/api/auth/signup` or `/api/auth/login` to receive a JWT.
2. Authenticated requests include `Authorization: Bearer <token>` header.
3. Attendance and subject operations persist to MongoDB.

## Frontend Overview (`frontend/`)
- **Framework**: React (Create React App) with Tailwind CSS for styling.
- **`src/App.jsx`**: Central state container using React Context.
  - Persists `subjects`, `attendance`, `user`, and `token` in `localStorage` for offline-first usage.
  - Synchronizes data with backend when a JWT token is present.
  - Provides helper methods (`addSubject`, `markAttendance`, `loginUser`, etc.) to child components via context.
- **`src/components/`**: UI building blocks (navbar, subject cards, attendance form, stats dashboard, etc.).
- **`src/pages/`**: Route-level components (`Home`, `Subjects`, `SubjectDetails`, `Login`, `Signup`).
- **`src/lib/api.js`**: Fetch helper that prefixes API base URL and attaches JWT token headers.
- **Routing**: Configured via `react-router-dom`; `App.jsx` defines routes.

### Data Flow
1. Anonymous users manage data locally; state is persisted in `localStorage`.
2. After login/signup, the frontend calls backend APIs to migrate data and keep remote state in sync.
3. UI components consume the context-provided data/actions to render forms, navbars, and stats.

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)

### Setup Steps
1. Install dependencies for both backend and frontend:
   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```
2. Create environment files:
   - `backend/.env`
     ```env
     MONGO_URI=your-mongodb-uri
     PORT=5000
     JWT_SECRET=your-jwt-secret
     ```
   - `frontend/.env.local`
     ```env
     REACT_APP_API_BASE_URL=http://localhost:5000
     ```
3. Run backend (default port 5000):
   ```bash
   cd backend
   npm run dev
   ```
4. Run frontend (default port 3000):
   ```bash
   cd frontend
   npm start
   ```
5. Visit http://localhost:3000 in your browser.

## Features
- Mobile-first UI optimized for phones and tablets.
- Local storage persistence for offline capability.
- JWT authentication with optional server sync.
- Subject management (create/edit/delete).
- Attendance tracking with per-day status.
- Stats dashboard summarizing attendance patterns.

## Testing & Future Improvements
- Add automated tests (e.g., Jest) for controllers and React components.
- Integrate CI/CD for linting, testing, and deployment.
- Extend analytics and reporting features.
- Add role-based access (instructors vs students).
