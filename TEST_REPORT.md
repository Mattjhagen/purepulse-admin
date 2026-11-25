# Test Report

## Discovery checks

- Remote reachability: passed for all five GitHub repositories.
- Repository preservation: passed; each source is cloned in the recovery workspace.
- Live domain response: passed HTTP 200; confirmed current Vite title and assets.
- Original asset parity: passed; `/var/www/purepulse/index.html` SHA-256 matches `PurePulse/index.html`.
- Host service inventory: passed read-only inspection; unrelated services remain untouched.

## Application checks

Pending clean dependency installation and canonical recovery changes. Existing repository tests include affiliate social assets, Stripe global payout sandbox, Google Calendar, GitHub deployment, and handoff integration coverage. These will be rerun with a writable task-local npm cache before staging.
