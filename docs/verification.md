# Verification

Run checks from the project root after `npm ci`:

```sh
npm run check
npm run build
npm run test:deploy
python3 -B deploy/install.py --check
bash -n deploy/gcp-vm.sh
```

`check` runs TypeScript checks, automated tests, and Prettier validation. There is no separate ESLint configuration. The backend HTTP tests require permission to listen on an ephemeral localhost port. Database suites skip unless explicitly configured; a passing ordinary test run is not proof that those skipped tests passed.

## Database-backed tests

Create a disposable PostgreSQL database owned by a test-only account. Set `TEST_DATABASE_URL` and run `npm run test:database`. The integration suites initialize and clear test data; never point this variable at your local working/demo database or a real deployment. Read their setup before running them against any unfamiliar database.

## Challenge review

The catalog checks enforce 40 unique IDs, 20 public/20 event-only entries, all supported categories, nonempty attachments, and answer recovery from the supplied text. Most exercises are simple string extraction; ROT13, hexadecimal, and Vigenère examples have decoder assertions. They are beginner demo fixtures, not a claim of realistic exploitation coverage.

On a populated instance, run `npm run seed:audit` to verify resource metadata against the stored files and hashed flags, event assignments, and archived event solve times. Attachment paths are private server files, not GitHub download URLs. The four research repository URLs in [challenge sources](challenge-sources.md) were reachable during the September 2026 review; remote availability can change.

## Manual acceptance checks

- Register and verify an account, sign in/out, reset a password, and confirm no codes appear in logs or public API responses.
- Submit an author challenge, review it as administrator, and solve it as another player. Confirm the author cannot score their own work.
- Download a local file and open an HTTPS resource link, including any public Drive attachment.
- Check event registration, access restrictions, hints, incorrect attempts, duplicate solves, archived results, and separate practice scores.
- Confirm demo accounts use reserved addresses and no external email is sent to them.
- Test role-switching browser preview separately from authenticated server workflows.
- Inspect desktop/mobile layouts, keyboard navigation, reduced motion, and Safari rendering.
- On the VM, verify `/api/ready` through HTTPS, private API/database binding, service restart, backup restoration, and certificate renewal.

Unit tests and source checks do not replace these checks or an actual GCP installation trial.
