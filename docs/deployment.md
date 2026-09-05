# GCP demo deployment

This guide installs a **populated demonstration instance**, including seeded users, challenge downloads, varied progress, and events. The app uses a production build and HTTPS for secure hosting; the database is still demo data. Do not mix it with sensitive information or real competition results.

## Before you start

Use a fresh, dedicated Ubuntu 24.04 LTS Compute Engine VM (x86_64 or arm64), with at least 2 vCPU, 4 GB RAM, and 20 GB free disk as a practical starting point. The installer refuses an existing Node.js/PostgreSQL installation or a previous FlagArena install. It does not create or bill GCP resources for you.

Prepare:

1. A [reserved static external IPv4 address](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address) attached to this VM.
2. A domain such as `arena.example.com`, with an **A record pointing to that address**. Remove stale AAAA records and disable CDN proxying for initial installation. No CNAME is needed for this direct setup.
3. A narrowly targeted [GCP firewall rule](https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create) allowing inbound TCP **80 and 443** to this VM. Keep SSH restricted to your administrator access method. Do not expose PostgreSQL 5432 or the API port.
4. Outbound HTTPS and package-repository access. The VM must resolve its own public hostname.
5. A [verified Resend domain](https://resend.com/docs/dashboard/domains/introduction), sending API key, and sender address. Copy Resend's exact DKIM/SPF/MX records into your DNS provider; their values are specific to your domain.

Copy or clone the project directory onto the VM. Do not upload your local `.env`, uploads, dependencies, or database dumps as part of the source checkout.

## Interactive installer

Over an interactive SSH terminal, from the project root:

```sh
sudo bash deploy/gcp-vm.sh
```

It prompts for hostname, external IP, private API port (default **8080**), administrator name/email/password, a separate demo-account password, Resend sender/name/key, and certificate contact email. Password entry is hidden. It prints DNS/firewall instructions and waits while you complete them.

Before the final `DEPLOY` confirmation it checks DNS and sends one configuration-only message to Resend's `delivered@resend.dev` test sink. This validates sending permission and acceptance of your configured From address, not delivery to a human mailbox. Invalid credentials, sender configuration, or DNS stop installation. You may cancel and rerun before confirming; no packages or database changes have happened at that point. The validation request itself is an external Resend operation.

After confirmation it:

- Installs PostgreSQL, Nginx, Certbot, build tools, and the latest Node.js 24 LTS archive with a SHA-256 check against the official distribution manifest.
- Installs locked npm dependencies, runs type checks, unit/HTTP tests and formatting checks, and builds the app under an unprivileged account.
- Generates private database and signing secrets, applies migrations, and creates your administrator.
- Seeds the complete demo: 40 approved exercises, workflow examples, fictional users, progress, and three events including archived results. Seed accounts use your separately entered password, not a hardcoded public password.
- Configures Nginx, obtains a Let's Encrypt certificate, starts the systemd service, enables renewal, and checks HTTP readiness, HTTPS, and a certificate-renewal dry run.

The sample administrator (`nisha.rao@flagarena.test`) has real administrative powers within this demo. Share demo credentials only with trusted participants. Point anonymous visitors to `/preview`, whose actions remain in their browser. Seeded `.test` addresses do not receive email; real registration addresses still use your configured Resend sender.

## Ports and installed paths

| Item                           | Default                                     |
| ------------------------------ | ------------------------------------------- |
| Public site                    | `https://your-domain`, TCP 443              |
| Redirect and ACME verification | TCP 80; keep open for renewal               |
| Private API                    | `127.0.0.1:8080`, configurable during input |
| PostgreSQL                     | Local TCP 5432, not exposed publicly        |
| Application                    | `/opt/flagarena`                            |
| Private environment            | `/etc/flagarena.env`, root-readable only    |
| Uploads                        | `/var/lib/flagarena/uploads`                |
| Application service            | `flagarena.service`                         |
| Nginx site                     | `/etc/nginx/sites-available/flagarena`      |

No port forwarding is needed for normal public access. Keep TLS at Nginx, API loopback binding, secure cookies, and proxy trust restricted to this single local reverse proxy. The installer does not launch vulnerable third-party challenge services on the VM.

## Operations and backups

```sh
sudo systemctl status flagarena nginx postgresql
sudo journalctl -u flagarena -n 100
sudo systemctl list-timers certbot.timer
sudo certbot renew --dry-run
```

Back up PostgreSQL, `/var/lib/flagarena/uploads`, and `/etc/flagarena.env` to encrypted private storage. Never put them in Git. For a consistent small-instance backup, stop `flagarena`, take `pg_dump -Fc` as the PostgreSQL administrator, archive uploads, and restart the service. Test restoration into a separate database/VM before relying on a backup. Preserve upload ownership (`flagarena`) and private file permissions when restoring.

For updates, take a backup and VM snapshot, stop the app, stage the reviewed source and locked dependencies, run the checks/build, apply migrations with the existing private environment, and restart. Do not rerun this first-install script over an existing installation. Review migration reversibility before updates; do not assume reverting a migration can recover lost data.

## Failure and recovery

Before confirmation, cancellation leaves the machine unchanged apart from the Resend validation request. **After confirmation, installation is not transactional:** a failed build, blocked port 80, DNS propagation, certificate rate limit, or package failure can leave installed packages/files/database state. The script stops at the failing stage and reports it; it does not delete data or automatically retry destructive steps.

For this fresh demo VM, the safest retry is restoring the pre-install VM snapshot or creating another fresh VM, then rerunning with corrected inputs. If inspecting a partial install, use systemd/Nginx/Certbot logs, never paste `/etc/flagarena.env` into a public report. Changing domain or moving the VM later requires updating DNS, application URL, Nginx, and the certificate.

The installer is interactive by design. GCP **metadata startup scripts cannot answer prompts**; run this script over SSH instead. DNS/firewall authorization remains in your GCP/DNS account, and the script explains those steps before deployment rather than requesting cloud credentials.

## Manual configuration reference

For an existing server, use `deploy/flagarena.service` and `deploy/nginx.conf` as templates rather than running the fresh-VM installer. Install compatible Node/PostgreSQL, build the workspaces, provide the variables in `backend/.env.example`, run migrations and administrator bootstrap, then obtain TLS using Certbot. Review filesystem ownership and network rules for your environment. The templates are not an automated migration of an existing server.

## Validation scope

The repository contains installer validation tests and a non-mutating source-input check:

```sh
python3 -B deploy/install.py --check
npm run test:deploy
```

These do not prove a live GCP deployment succeeds. Package installation, Nginx integration, DNS reachability, issuance, and renewal must be verified on the target VM; the installer performs those checks during execution.
