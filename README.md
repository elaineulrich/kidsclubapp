# Kids Club Manager

A mobile-first web application for managing a church/ministry Kids Club program: child registration, attendance check-in/check-out, transportation routing, driver navigation, and reporting.

## Stack

- **Frontend/Backend:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth (Credentials) — staff (email/password) and drivers (login code)
- **Styling:** Tailwind CSS

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `CHURCH_ADDRESS`.

3. Push the schema and seed sample data:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

### Seeded logins

- Admin: `admin@kidsclub.org` / `admin123`
- Volunteer: `mike@kidsclub.org` / `volunteer123`
- Driver codes: `VAN1-4829` (Mike), `VAN2-1173` (Sarah)

**Change these credentials before deploying to production.**

## App Areas

- `/` — Public marketing website (rebuilt from havenkidsclub.com): hero, vision & mission, photo gallery, donations, a child Registration form, and a Contact form. Both forms email their submissions to `CONTACT_EMAIL` (defaults to `havenkidsclub@gmail.com`) via Resend. The nav includes a "Staff Login" link to `/login`.
- `/admin` — Admin dashboard: manage families, children, events, drivers, vans, route assignments, and reports.
- `/checkin` — Check-in volunteer dashboard: search a child, check in/out.
- `/driver` — Driver login (via login code) and `/driver/route` — today's assigned pickup route with Google Maps navigation links.
- `/login` — Staff (admin/volunteer) login.

## Roles

| Role      | Access |
|-----------|--------|
| Admin     | Full access to all records, routing, and reports |
| Volunteer | Search/check-in/check-out children only |
| Driver    | View their own assigned route and mark pickups complete |

## Recurring Transportation

When assigning routes for a new event, any child needing a ride who isn't yet assigned is shown with a suggested van based on the van they most recently rode — admins can accept the suggestion with one click or reassign as needed.

## Deployment

Designed to run on Railway (or any Node + PostgreSQL host). Set the environment variables from `.env.example` in your hosting provider, then run `npm run build && npm run start`.
