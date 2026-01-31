# French Quest

A Duolingo-like French learning app for English and Polish speakers, built with vanilla JS, Express, and SQLite.

## Features
- Email/password auth with secure sessions (HttpOnly cookies), bcrypt hashing, and CSRF protection.
- Bilingual UI (English + Polish) with JSON i18n files.
- A1 → B1 curriculum plus a B2 preview unit stored in SQLite.
- Multiple exercise engines: multiple choice, fill-in-the-blank, ordering, matching, listening (Web Speech), and speaking (optional, feature-detected).
- Gamification: XP, streaks, hearts, daily quests, leaderboard, and achievements.
- Mistake review with spaced repetition scheduling and adaptive review for struggling learners.
- Admin panel to create/edit lessons.

## Folder Structure
```
.
├── app.js
├── server.js
├── db.js
├── migrations/
├── public/
│   ├── index.html
│   ├── reset.html
│   ├── css/
│   ├── js/
│   └── i18n/
├── scripts/
├── tests/
└── README.md
```

## Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run migrations:
   ```bash
   npm run migrate
   ```
3. Seed demo data:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm start
   ```

Open `http://localhost:3000`.

### Demo Accounts
- Learner: `demo@frenchquest.local` / `DemoPass123`
- Admin: `admin@frenchquest.local` / `AdminPass123`

## API Endpoints
All `/api` routes require a CSRF token header (`x-csrf-token`) except for `GET` requests.

### Auth
- `POST /api/auth/register`
  - Request: `{ "email": "user@example.com", "password": "Password1!", "uiLanguage": "en" }`
  - Response: `{ "id": 1, "email": "user@example.com", "uiLanguage": "en" }`
- `POST /api/auth/login`
  - Request: `{ "email": "user@example.com", "password": "Password1!" }`
  - Response: `{ "id": 1, "email": "user@example.com", "uiLanguage": "en" }`
- `POST /api/auth/logout`
  - Response: `{ "ok": true }`
- `POST /api/auth/request-reset`
  - Request: `{ "email": "user@example.com" }`
  - Response: `{ "ok": true }` (prints reset link in server console)
- `POST /api/auth/reset`
  - Request: `{ "token": "...", "newPassword": "NewPass123" }`
  - Response: `{ "ok": true }`

### User & Progress
- `GET /api/me`
  - Response: `{ "user": { ... }, "progress": { ... } }`
- `PATCH /api/me`
  - Request: `{ "uiLanguage": "pl", "dailyGoal": 40 }`
- `POST /api/progress/record`
  - Request: `{ "correct": false, "itemKey": "{...}" }`
- `GET /api/review`
  - Response: `{ "items": [ { "item_key": "{...}", "count": 2 } ] }`
- `POST /api/progress/reset`
  - Response: `{ "ok": true }`
- `POST /api/progress/heal`
  - Response: `{ "ok": true, "hearts": 5 }`
- `GET /api/achievements`
  - Response: `{ "achievements": [ { "id": "xp_100", "earned": true } ] }`

### Lessons
- `GET /api/lessons`
  - Response: `{ "lessons": [ { "id": 1, "unit": "Unit 1: Greetings", ... } ] }`
- `GET /api/lessons/:id`
  - Response: `{ "lesson": { ... }, "progress": { "status": "in_progress", "last_position": 2 } }`
- `POST /api/lessons/:id/position`
  - Request: `{ "position": 3 }`
- `POST /api/lessons/:id/complete`
  - Request: `{ "xp": 50 }`

### Gamification
- `GET /api/quests`
- `POST /api/quests/progress`
  - Request: `{ "key": "earn_xp", "amount": 50 }`
- `GET /api/leaderboard`

### Admin
- `POST /api/admin/lessons`
  - Request: `{ "unit": "Unit 1", "level": "A1", "titleFr": "...", "titleEn": "...", "titlePl": "...", "content": { ... } }`
- `POST /api/admin/lessons/:id`
  - Request: `{ "unit": "Unit 1", "level": "A1", "titleFr": "...", "titleEn": "...", "titlePl": "...", "content": { ... } }`

## Tests
Run:
```bash
npm test
```

## Notes
- SQLite database is stored in `data/app.db` by default. Override with `DB_PATH`.
- Password reset tokens are printed to the console in dev mode.
