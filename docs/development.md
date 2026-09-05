# Local development

Use Node.js 24 LTS, npm, and a local PostgreSQL database. Run commands from the project root unless noted otherwise. Never use a real competition database for seeds or tests.

## Install and configure

```sh
npm ci
cp backend/.env.example backend/.env
```

Create a PostgreSQL login and an empty database using your PostgreSQL administrator. One interactive option:

```sh
createuser --pwprompt flagarena
createdb --owner=flagarena flagarena
```

Set `DATABASE_URL` in `backend/.env` to the database you created. URL-encode special characters in a database password. Set `JWT_SECRET` to a random value of at least 32 characters. Keep `NODE_ENV=development`, `APP_URL=http://localhost:5173`, and `PORT=4000` for the default local setup.

Set `MAIL_MODE=file` to inspect verification and password-reset messages locally in `var/mail/`. This directory contains private codes and must not be committed. To test actual email, use `MAIL_MODE=resend`, a sending key, and a sender on a domain verified in Resend. Do not paste keys into issue reports.

```sh
npm run build
npm run migration:run
```

## Initial administrator

The bootstrap command accepts `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` from the environment. It refuses to run once any administrator exists. For example, in Bash, read the password without storing it in shell history:

```bash
read -r -p 'Administrator name: ' ADMIN_NAME
read -r -p 'Administrator email: ' ADMIN_EMAIL
read -r -s -p 'Administrator password: ' ADMIN_PASSWORD
echo
export ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
npm run create-admin
unset ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

Then start both services:

```sh
npm run dev
```

Open `http://localhost:5173`; administrator access is at `/admin/login`. The frontend development server proxies API requests to the local backend.

## Optional populated demo

```sh
SEED_CONFIRM=development-only npm run seed
```

The seed creates 40 approved, downloadable text exercises split evenly between public practice and event-only visibility, three draft/review examples, sample users, varied progress, and three events. The event times are relative to the **first** seed run and are preserved on reruns; the initially active event will eventually end.

Local fixture passwords default to `FlagArena-demo-2026!`. Supply `SEED_PASSWORD` to choose another on first insertion. Existing passwords are not reset by rerunning the seed. Base accounts are `author@example.test` and `player@example.test`; additional fictional names use `@flagarena.test`. The sample administrator is `nisha.rao@flagarena.test`. If no administrator exists, the seed also creates `admin@example.test`. These are reserved test domains, not real Gmail accounts. The invite-only sample event's join code is `college-demo`.

Seed IDs are reserved for fixtures. Reruns update the catalog's fixture metadata, answers, hints, resource references, and archived-event timestamps; unrelated application data is not deleted. Content-addressed attachment filenames keep a corrected answer paired with the corrected file. Older unreferenced files are retained, not silently deleted.

For the VM demo, the installer uses an explicit `DEMO_MODE=1`, `SEED_CONFIRM=demo-deployment`, and the demo password you enter. It creates your administrator first and does not overwrite that account. `NODE_ENV=production` is retained for secure hosting; it does not mean the data is a real production competition. The seed does not send emails, and demo-mode mail delivery skips all `.test` recipients.

`SEED_SAMPLES_ONLY=1` is an optional local mode for adding sample challenges to an existing administrator's workspace without creating fixture users or progress. The VM installer does **not** use this mode.

## Browser-only preview

```sh
npm run build --workspace=@flagarena/shared
npm run dev:web
```

Visit `/preview`. Its role-changing interactive workspace is separate from PostgreSQL and uses local example data. It is useful for trying workflows, not for testing authorization, server persistence, or real email delivery.

## Checks

Run `npm run check`, `npm run build`, and `npm run test:deploy`. See [verification](verification.md) for database-backed tests. Do not include `.env`, `var/`, dependencies, or generated builds in commits.
