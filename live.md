# Deploying Self Attendance App

This guide covers deploying the backend on Render and the frontend on Vercel.

## Backend on Render

1. **Create the service**
   - Log in to Render and create a new **Web Service**.
   - Connect to your GitHub repo `Shaktiprasadram22/Self_Attendance`.
   - Select the `backend/` directory as the root.

2. **Environment**
   - Runtime: Node.js 18+.
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`

3. **Environment variables**
   - Add `MONGO_URI` with your MongoDB connection string.
   - Add `JWT_SECRET` with a secure random string.
   - Optionally set `PORT=10000` (Render auto assigns but you can override).

4. **Deploy**
   - Click deploy. Render will install dependencies and start the service.
   - Note the live URL (e.g., `https://self-attendance-lymy.onrender.com`).

5. **CORS configuration**
   - The backend already enables CORS for all origins. If you want to restrict it, update `backend/server.js`.

## Frontend on Vercel

1. **Create the project**
   - Log in to Vercel and import the same GitHub repo.
   - Set root directory to `frontend/`.

2. **Environment**
   - Framework preset: Create React App.
   - Build command: `npm run build`
   - Output directory: `build`

3. **Environment variables**
   - Add `REACT_APP_API_BASE_URL` pointing to your Render backend URL, e.g., `https://self-attendance-lymy.onrender.com`.

4. **Deploy**
   - Trigger the deployment. Vercel will build the frontend and host it globally.
   - You’ll get a URL like `https://self-attendance.vercel.app`.

## Post Deployment Checklist

- Test login/signup to ensure JWT authentication works with live URLs.
- Confirm attendance data syncs correctly by marking attendance in the frontend and verifying via API (e.g., `GET /api/attendance/all`).
- Update `.env.local` locally to match production base URLs for future builds.
