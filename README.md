# Instagram Login Clone — Full-Stack Build

A responsive Instagram login clone (desktop + mobile designs) turned into a
working full-stack application with **zero external dependencies**.

## Stack

- **Backend:** Node.js (built-in `http` module)
- **Database:** SQLite via the built-in `node:sqlite` module
- **Frontend:** HTML + Tailwind CSS (CDN), responsive across mobile/tablet/desktop

## Run it

Requires Node.js `>= 22.5.0` (for the built-in SQLite module).

```bash
node server.js
# or
npm start
```

The app listens on `http://0.0.0.0:3000` (override with `PORT` / `HOST` env vars).

## Behaviour

| Route            | Method | What it does                                                        |
| ---------------- | ------ | ------------------------------------------------------------------- |
| `/`              | GET    | Responsive login page (mobile header + desktop hero collage)        |
| `/login`         | POST   | Saves username + password, then redirects to `/maintenance`         |
| `/maintenance`   | GET    | "Server down — please try again later (under maintenance)" page     |
| `/users`         | GET    | Demo HTML table of saved logins                                     |
| `/api/users`     | GET    | Saved logins as JSON (demo)                                         |

## Storage

Credentials are stored **without encryption** (as requested) in
`data/instagram.db` — the `users` table contains `username` and `password`
columns in plaintext. `data/` is git-ignored so credentials never leave the
local machine.

> ⚠️ This is a demonstration of a plaintext-storage requirement. Never store
> real passwords without hashing + salting in a production system.

## Layout of the app

```
server.js            # HTTP server, SQLite setup, routes
public/index.html    # responsive login page (merged mobile + desktop designs)
public/maintenance.html  # post-login "under maintenance" page
public/assets/       # locally generated collage imagery
data/instagram.db    # SQLite database (git-ignored, created at runtime)
```
