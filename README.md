# ProjectHub

A full-stack academic project allocation and progress management platform built with Next.js, Supabase, TypeScript and Tailwind CSS.

## Features

- Student and faculty/admin portals
- Supabase email/password and OTP authentication
- Role-based server authorization
- Supabase RLS and transactional project allocation
- Configurable 1–10-day project countdown and daily checklist tracking
- Submission versions, URL validation and faculty review
- Bulk project creation from a downloadable CSV template
- Notifications, audit logs and analytics
- Responsive desktop, tablet and mobile interfaces

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The application includes professional demo screens when Supabase environment variables are not configured. It does not claim a live integration until real credentials are supplied.

## Supabase setup

1. Create a hosted Supabase project.
2. Apply all migrations, in filename order, with the Supabase SQL editor or CLI:
   - `supabase/migrations/20261124000000_projecthub.sql`
   - `supabase/migrations/20261124010000_secure_workflows.sql`
   - `supabase/migrations/20261124020000_fix_profile_signup.sql`
   - `supabase/migrations/20261124030000_fix_allocation_policy_recursion.sql`
   - `supabase/migrations/20261124040000_fix_remaining_allocation_recursion.sql`
   - `supabase/migrations/20261127010000_allow_students_to_cancel_project_allocations.sql`
   - `supabase/migrations/20261127020000_add_admin_faculty_management_workflow.sql`
   - `supabase/migrations/20261127030000_persist_project_duration_settings.sql`

   For an existing Supabase project, apply only migrations that have not already run. In particular, if the five `20261124...` migrations are already applied, apply the three `20261127...` migrations in order; do not rerun previously applied SQL editor migrations.
3. Set `.env.example` values in `.env.local` and in Vercel.
4. Configure Site URL and redirect URLs in Supabase Authentication.
5. Enable email/password and email OTP providers.
6. To allow new students to enter immediately after setting a password, turn off **Confirm email** under Supabase Authentication settings. This allows unverified email addresses to sign up; keep it on if verifying email ownership is required. With confirmation off, signup establishes a session and sends the student directly to the portal. Returning users can sign in with either password or email OTP.
7. Configure SMTP for production email delivery when using OTP or other auth emails.
8. Create the first super-admin using the Supabase dashboard, then elevate only that trusted profile from the SQL editor:

   ```sql
   update public.profiles
   set role = 'SUPER_ADMIN'
   where email = 'the-trusted-admin-email';
   ```

   New public signups are always assigned `STUDENT`. Never expose service-role keys in browser code.
9. Super-admins can edit faculty profiles and subject assignments, manage student/faculty account access, and set a 1–10 day duration for future project allocations in the portal settings.

The browser app uses only the Supabase project URL and anon/publishable key. `SUPABASE_SERVICE_ROLE_KEY` is optional, server-only, and used only by the super-admin faculty-invitation endpoint. Never prefix it with `NEXT_PUBLIC_` or expose it in browser code. No credentials are required in chat.

## Build

```powershell
npm run build
npm start
```

## Critical rules

- Partial unique indexes enforce one active project per project and one active project per student.
- `allocate_project` is atomic and snapshots requirement/checklist data.
- `cancel_project_allocation` lets a student release their own unsubmitted allocation; the allocation and checklist history are retained, and the project becomes available again.
- `admin_update_faculty` validates faculty changes and replaces subject assignments transactionally.
- Portal project duration is stored in `portal_settings` and is used when new project deadlines are created; changing it does not alter existing allocations.
- Progress is derived from completed checklist records.
- Submission history is preserved with `(allocation_id, submission_version)`.
- RLS denies cross-student private record access.
- Student registration, email OTP, password login/reset, project allocation, checklist updates, submission, and faculty review use Supabase Auth/RPC.

The Supabase migrations must be applied to enable these workflows. Before they are applied, the site intentionally displays demo content; demo interactions are not persisted.

## Demo routes

- `/login`, `/register`, `/verify-otp`, `/forgot-password`
- `/student/dashboard`, `/student/subjects`, `/student/projects`
- `/student/my-project`, `/student/progress`, `/student/submission`
- `/admin/dashboard`, `/admin/subjects`, `/admin/projects`
- `/admin/projects/import`, `/faculty/projects/import`
- `/admin/allocations`, `/admin/submissions`, `/admin/reports`

## Deployment

Push the repository to GitHub, import it into Vercel, and add public Supabase environment variables. Configure the Vercel domain in Supabase redirect URLs.
