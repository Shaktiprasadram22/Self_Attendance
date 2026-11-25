# Self Attendance API

Express and MongoDB store separate student accounts, subjects, attendance, and todos in the `self-attendance` database. Guest records and a cache of signed-in records are stored in the frontend browser.

## Local setup

Use Node.js 22 or later. From `backend`, run `npm ci`, copy `.env.example` to `.env`, and configure:

```dotenv
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<a randomly generated secret of at least 32 characters>
PORT=5000
```

Generate a session-signing secret locally:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run `npm run dev` for development or `npm start` for production. The frontend uses `REACT_APP_API_BASE_URL` for the backend URL, with the local development proxy as its fallback.

Real `.env` files are ignored by Git. Configure `MONGO_URI` and `JWT_SECRET` directly in the backend hosting environment before deploying. Never put them in frontend variables. Changing `JWT_SECRET` requires existing users to sign in again.

## Availability and history

The backend retries initial database connection failures every 15 seconds. `/api/attendance/health` returns 200 only when MongoDB answers a ping. Unavailable databases return 503; API requests are rejected before authentication or writes are attempted.

The frontend loads all attendance pages, authenticates the initial load with the newly issued token, and keeps cached data when a request fails. Failed saves do not mark local records as saved. Expired sessions display a sign-in link. Guest imports retain a local backup until migration succeeds and can resume after a partial failure.

## Browser recovery

Open `/recover.html` on the **existing frontend domain**, using the same device and browser that previously displayed the attendance. This page can download the saved copy without signing in or contacting the API. It exports the cached subjects, attendance, todos, and any earlier local backup; it excludes login tokens and account credentials and does not change local storage.

The copy may be incomplete. Records that were never cached on that device require the original database or a verified backup. Keep the existing frontend domain during recovery so that its browser storage remains accessible. Creating an empty database does not recover missing records.

## Verification

```sh
# From backend
npm test

# From frontend
CI=true npm test -- --runInBand
npm run build
```

Regression checks cover initial connection retries, readiness, unavailable versus expired sessions, immediate sign-in loading, full pagination, retained caches, failed writes, logout races, and resumable guest imports.
