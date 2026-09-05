# Google Calendar interview scheduling setup

The application code is ready, but Google OAuth and the database migration must be configured before applicants can book.

## 1. Apply the database migration

Run `supabase/migrations/038_google_calendar_interview_scheduling.sql` against the production Supabase project.

## 2. Create Google OAuth credentials

1. Open Google Cloud Console and select the PurePulse project (or create one).
2. Enable **Google Calendar API**.
3. Configure the OAuth consent screen. Add `matty@purepulse.one` as a test user while the app is in testing.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI:

   `https://login.purepulse.one/api/settings/google-calendar/callback`

## 3. Configure production environment variables

Add the following to the production deployment:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI=https://login.purepulse.one/api/settings/google-calendar/callback`
- `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` (generate with `openssl rand -base64 32`)
- `GOOGLE_CALENDAR_OAUTH_STATE_SECRET` (generate separately with `openssl rand -base64 32`)

Never expose these values through `NEXT_PUBLIC_` variables and never commit their values.

## 4. Connect the calendar

After deployment, sign in to PurePulse Admin, open **Settings**, find **Google Calendar Interview Scheduling**, and select **Connect Google Calendar**. Choose the Google account whose primary calendar should control availability.

## 5. Verify

1. Put a test event on the connected Google Calendar during a weekday between noon and 7 PM Central.
2. Complete a test application at `/affiliates/apply`.
3. Select **Schedule My Interview** on the confirmation screen.
4. Verify the test event's time is unavailable.
5. Book a different time and confirm that Google Calendar contains the new event, the candidate received an invitation, and the interview record is marked `scheduled_1on1`.

The public scheduler intentionally stops offering appointments when the Google connection is missing or invalid. It does not silently expose every slot as available.
