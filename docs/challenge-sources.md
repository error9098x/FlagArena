# Challenge seed sources

The local and deployed demo seed uses original text-only fixtures. They are intentionally
small, deterministic, and safe to inspect; the application never executes a
downloaded binary or starts a third-party service.

The following openly licensed repositories were reviewed for category coverage,
challenge shape, and player-facing resource conventions:

- [CSI VIT ctf-challenges](https://github.com/csivitu/ctf-challenges) — MIT; broad web, crypto, forensics, reversing, pwn, OSINT, and misc coverage.
- [CryptoHack CTF Archive](https://github.com/cryptohack/ctf_archive) — MIT; use only `release_files`, never server-side secrets.
- [sahuang/my-ctf-challenges](https://github.com/sahuang/my-ctf-challenges) — MIT; reviewed static examples such as Baby RSA, Safe Locker, and Lost Assignment.
- [Google CTF](https://github.com/google/google-ctf) — Apache-2.0; useful event-only design references, but intentionally vulnerable services must remain isolated from production.

The seed does not copy flags, writeups, binaries, or live infrastructure from
those repositories. If a future challenge imports a third-party attachment,
record its repository, commit, SPDX license, and exact `release_files` path in
this document before adding it to the uploads directory.

## Resource links

Challenge authors can attach a local file or an HTTPS resource link. A Google
Drive share link works when it is publicly accessible to the player; private
Drive links are not a reliable challenge dependency. The form validates
`https://` links; each resource represents either a local file or an external URL.
Check Drive links in a signed-out window before publication. The current seed
uses local attachments only; it does not depend on Google Drive or GitHub downloads.

The 40 approved exercises are beginner examples. Titles mentioning cryptography
or exploitation describe the theme, not a running vulnerable service or an
advanced problem. Category counts are web 8, crypto 8, forensics 7, reverse 5,
pwn 4, OSINT 4, and misc 4; use the manifest tests as the source of truth when
expanding the catalog. Difficulty must reflect the actual solving work.
