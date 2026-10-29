# Computer Inspection Tracker (Next.js + MongoDB)

One shared MongoDB database for every inspector and manager. Screens refresh every 15 seconds.

## 1. Set up MongoDB Atlas
1. Create a database user with **readWrite on `comptracker` only** (Atlas → Database Access).
2. Allow your server's IP (Atlas → Network Access).
3. Keep the real password only in `.env.local` (URL-encode special characters, e.g. `@` → `%40`).

## 2. Configure
    npm install
    cp .env.example .env.local
Edit `.env.local`: set `MONGO_URI`, a random `AUTH_SECRET` (`openssl rand -base64 48`), and the `ADMIN_*` values.
Use `COOKIE_SECURE=false` only if you serve the site over plain http (LAN); keep `true` behind HTTPS.

## 3. Create the first administrator, then run
    npm run seed-admin     # once; afterwards delete ADMIN_PASSWORD from .env.local
    npm run dev            # http://localhost:3000

Sign in as the admin → **Users** → create an account for each inspector (role *inspector*) and for
management (role *viewer*, read-only).

## Roles
| Role | Can do |
|---|---|
| admin | everything + manage users (create, disable, change role, reset password) |
| inspector | record inspections; delete their own |
| viewer | view floor plans, status and the management report (read-only) |

## Security built in
- Passwords hashed with bcrypt (cost 12); minimum 10 characters; users can change their own password.
- Signed (HS256) httpOnly, SameSite=Lax session cookie, 12 h lifetime; never readable by JavaScript.
- Every API call re-checks the user in the database: disabling a user or resetting a password signs them out immediately.
- Roles enforced on the server for every endpoint; middleware blocks unauthenticated pages and API calls.
- Login lockout (8 failures / 15 min per username), equal-time checks for unknown users, generic error messages.
- CSRF protection (SameSite + Origin check on every write), input validation, security headers.
- Inspections are soft-deleted (who/when kept) for an audit trail.

## Deploy
    docker build -t comp-tracker .
    docker run -p 3000:3000 -e MONGO_URI=... -e AUTH_SECRET=... comp-tracker
Or deploy to Vercel/any Node host and set the same environment variables. Serve over HTTPS.

## Lab layouts
`lib/layouts.js` is the single definition of the floor plans, used by both the screens and the server validation.

## Accountability
- Every inspection stores the signed-in person's name, username and the exact time it was recorded. The server sets this from the login session — it cannot be typed in or changed by the user.
- Floor-plan tiles show the inspector's initials; the status panel and history show "Inspected by … recorded at …".
- Management report → **Who inspected what** (per-inspector totals) and **Recent activity** (inspections and deletions, with who did them).
- Deleting is a soft delete: the record is hidden but kept with who deleted it and when. Inspectors can delete only their own records.
