# MySQL migration & powerful auth — setup notes

## What changed
- **Database**: MongoDB/Mongoose → **MySQL** via Sequelize (`backend/config/db.js`, `backend/models/*`).
  - All models (`User`, `Student`, `Company`, `Internship`, `Application`, `Certificate`, `Notification`) now use Sequelize with UUID primary keys.
  - Every model's `toJSON()` copies `id` into `_id`, so the existing frontend (which reads `item._id` everywhere) keeps working unchanged.
  - Associations (foreign keys, cascades) are defined in `backend/models/associations.js`.
  - `sequelize.sync({ alter: true })` runs on boot in development to keep tables in sync with the models. **For production, replace this with real migrations** (e.g. `sequelize-cli`) — `alter: true` is not safe for production schema changes.
- **Authentication is now much more robust**:
  - Short-lived (15 min) JWT **access tokens** + long-lived, rotating **refresh tokens** stored hashed in a `RefreshTokens` table and delivered via an `httpOnly` cookie (`backend/utils/generateToken.js`, `authController.js`).
  - Refresh-token **rotation + reuse detection**: reusing a revoked/expired refresh token revokes the whole session family.
  - **Account lockout**: 5 failed logins locks the account for 15 minutes (`User.failedLoginAttempts` / `lockUntil`).
  - **Rate limiting** on `/login`, `/register`, and password-reset routes (`backend/middleware/rateLimiter.js`), plus a global API limiter.
  - **Email verification** on signup (`/api/auth/verify-email/:token`, `/api/auth/resend-verification`).
  - **Forgot / reset password** flow (`/api/auth/forgot-password`, `/api/auth/reset-password/:token`), with all sessions revoked on reset.
  - **Change password** while logged in (`/api/auth/change-password`).
  - `helmet` for security headers, `cookie-parser` for the refresh cookie, CORS locked to `CLIENT_URL` with `credentials: true`.
  - Emails are sent with `nodemailer`; if no SMTP credentials are set in `.env`, it automatically falls back to a free Ethereal test inbox and prints a preview link to the console — so verification/reset flows work out of the box in development.

## Setup
1. Install MySQL locally (or use a hosted instance) and create a database, e.g.:
   ```sql
   CREATE DATABASE intent CHARACTER SET utf8mb4;
   ```
2. Copy `backend/.env.example` to `backend/.env` and fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a strong `JWT_SECRET`.
3. `cd backend && npm install`
4. `npm run dev` — on first run, Sequelize will create all tables automatically.
5. Frontend: no `.env` changes needed beyond the existing `VITE_API_URL`. `cd frontend && npm install && npm run dev`.

## New frontend pages
- `/forgot-password`, `/reset-password/:token`, `/verify-email/:token` — wired into `App.jsx`, styled to match the existing `Login` page.
- `utils/api.js` now sends cookies (`withCredentials: true`) and automatically refreshes an expired access token once via `/api/auth/refresh`, retrying the failed request transparently.
- Logout now also calls `POST /api/auth/logout` to revoke the refresh token server-side, not just clear local storage.

## Note on existing Mongo data
This migration does not include a data-migration script from MongoDB to MySQL — it sets up a fresh MySQL schema. If you have existing production data in MongoDB you need to keep, let me know and I can write a one-off migration script.
