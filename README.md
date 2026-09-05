<p align="center"><img src="docs/assets/logo.svg" alt="FlagArena" width="360"></p>
<p align="center">Your arena. Your rules.<br>A self-hosted home for hands-on security.</p>
<p align="center"><strong>Live at <a href="https://flagarena.kaintura.com">flagarena.kaintura.com</a></strong></p>

FlagArena brings challenge authors, players, and event organizers together. Publish file-based puzzles, review submissions, run timed events, and keep practice progress separate from competition results.

## What you can do

- **Play:** download challenge files, open resource links, unlock hints, submit flags, and follow your progress.
- **Author:** prepare challenges, attach resources, submit work for approval, and inspect challenge performance.
- **Organize:** review challenges, manage users, run open or invite-only events, and use fixed or dynamic scoring.
- **Explore:** switch roles in the browser-local interactive preview without creating an account.
- **Self-host:** one application, PostgreSQL, local uploads, and Resend email. No external challenge execution service is required.

## Deploy a populated demo on GCP

Use a fresh **Debian 12/13 or Ubuntu 22.04/24.04 LTS VM**, a reserved external IPv4 address, a domain you control, and a verified Resend sender. Copy or clone this repository onto the VM, then run from the project root over SSH:

```sh
sudo bash deploy/gcp-vm.sh
```

The installer collects all settings first, explains the DNS and firewall steps, validates DNS and the Resend sender, and asks for a final `DEPLOY` confirmation. It installs dependencies, checks and builds the application, creates PostgreSQL and your initial administrator, loads the demo seed, and configures Nginx, HTTPS, renewal, and the application service.

The demo includes **40 approved beginner exercises: 20 public and 20 event-only**, workflow examples, sample users with varied progress, and active, upcoming, and archived events. Its small text attachments are original learning fixtures, not advanced exploit challenges or imported competition archives.

Your administrator password and the sample-account password are separate. Sample users include an administrator with real permissions on this demo database—share that password only with trusted demonstrators. Anonymous visitors can use `/preview`. Do not store sensitive data or run a real competition on a shared demo.

Public HTTPS uses **443**, with **80** for redirects and certificate validation. The API defaults to **127.0.0.1:8080** and PostgreSQL stays private. Neither needs a public firewall rule or port forwarding.

Read the [deployment guide](docs/deployment.md) before starting. The installer is for a first installation, not an in-place upgrade or a noninteractive GCP metadata startup script.

## Run locally

Requirements: Node.js 24 LTS, npm, and PostgreSQL. For the browser-only preview, PostgreSQL is optional.

```sh
npm ci
npm run build --workspace=@flagarena/shared
npm run dev:web
```

Open `http://localhost:5173/preview`. This preview uses browser-local demo state, not your PostgreSQL database.

For the full application, follow [local database and email setup](docs/development.md), then run `npm run dev`.

## Check the project

```sh
npm run check
npm run build
npm run test:deploy
```

Database integration tests require a separate disposable database; see [verification](docs/verification.md). Tests that exercise HTTP bind an ephemeral local port.

## Documentation

- [Local development and demo seed](docs/development.md)
- [GCP deployment, HTTPS, backups, and recovery](docs/deployment.md)
- [Architecture and domain rules](docs/architecture.md)
- [API reference](docs/api.md)
- [Challenge sources and resource links](docs/challenge-sources.md)
- [Verification](docs/verification.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Repository hygiene

Publish from this project directory. Environment files, dependencies, uploads, builds, logs, database dumps, local reports, and scratch outputs are ignored. Keep `package-lock.json`, `.env.example`, source, tests, deployment scripts, and documentation assets. Review staged files before publishing; ignore rules do not remove files that were already tracked.

Dependency licenses are retained in their packages. The project's own package currently declares `UNLICENSED`; public source availability alone does not grant a reuse license.
