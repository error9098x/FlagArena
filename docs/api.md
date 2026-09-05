# API Reference

Base path: `/api`. Requests and responses are JSON except resource upload/download. Authenticated requests send `Authorization: Bearer <access token>`. The browser also sends the HTTP-only refresh cookie. Unsafe requests from a different browser origin are rejected.

The exact request contracts live in [`shared/src/schemas`](../shared/src/schemas); response DTOs live in [`shared/src/types/index.ts`](../shared/src/types/index.ts). Do not create a second client-specific schema definition.

## Conventions

- IDs are UUIDs. Dates use ISO 8601 with an explicit offset. The server decides event timing.
- Paged reads accept `page` (starting at 1) and `limit` (1–100), returning `{items,total,page,limit}`.
- Challenges, reviews, downloads, and leaderboards accept an optional `eventId` query parameter where an event context applies. Flag submissions and hint unlocks include `eventId` in the body.
- Omitting `eventId` means public practice, not an aggregate of all events.
- Successful writes return the relevant record or `{message}`; deletion/logout may return 204.
- Errors return `{code,message,details?,retryAfter?}`. Validation is 400; authentication 401; authorization/lifecycle 403; unavailable resources 404; duplicate records 409; oversized files 413; limits 429. `Retry-After` accompanies durable rate-limit errors.
- Flags, verifier hashes, join-code hashes, storage paths, passwords, OTPs, and reset tokens are never included in normal read responses. A newly generated privileged-account temporary password is returned once to the Admin who created it.

## Account access

`GET /public/home` is unauthenticated and returns only whitelisted summaries of approved public-practice challenges and current/upcoming open events. It excludes private event details, flags, hint content and unreleased challenges.

`POST /auth/admin/login` accepts the same login fields but issues a session only for an Admin. It does not bypass password checks; initial/Admin-created accounts are already verified.

| Method | Path                    | Input / purpose                                                            |
| ------ | ----------------------- | -------------------------------------------------------------------------- |
| GET    | `/health`               | Process liveness.                                                          |
| GET    | `/ready`                | Database connection readiness; 503 when unavailable.                       |
| POST   | `/auth/register`        | `username,email,password`; creates unverified Player and sends code.       |
| POST   | `/auth/verify`          | `email,code`; six digits, ten-minute expiry, five wrong attempts.          |
| POST   | `/auth/resend`          | `email`; invalidates the preceding code.                                   |
| POST   | `/auth/login`           | `email,password`; returns safe user and access token, sets refresh cookie. |
| POST   | `/auth/refresh`         | Rotates refresh cookie; old-token replay revokes its session family.       |
| POST   | `/auth/logout`          | Revokes the current refresh-session family and clears cookie.              |
| POST   | `/auth/forgot-password` | `email`; generic response whether eligible or not.                         |
| POST   | `/auth/reset-password`  | `token,password`; consumes reset token and revokes sessions.               |
| POST   | `/auth/change-password` | Authenticated; `currentPassword,newPassword`; forces re-login.             |
| GET    | `/auth/me`              | Current account.                                                           |
| PATCH  | `/auth/me`              | `username`; public display-name update.                                    |

Accounts with a temporary password can access account/password operations but cannot use feature endpoints until changing it. Suspension and session revocation are checked on the backend, not only by the client router.

## Challenges and resources

| Method | Path                                   | Access / purpose                                                                                   |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/challenges`                          | Authorized catalog; `view=manage` for Admin/Author bank.                                           |
| GET    | `/challenges/:id`                      | Safe detail, authorized resources and unlocked hints.                                              |
| GET    | `/challenges/authors`                  | Admin/Author; author names for the accessible challenge bank, independent of user-list pagination. |
| POST   | `/challenges`                          | Admin/Author; create draft.                                                                        |
| PUT    | `/challenges/:id`                      | Admin or owning Author; edit unreleased draft/rejected content.                                    |
| POST   | `/challenges/:id/submit-review`        | Admin or owning Author; submit draft/rejected challenge.                                           |
| POST   | `/challenges/:id/moderate`             | Admin; `status,reason`. Approval/rejection/disable/archive.                                        |
| PATCH  | `/challenges/:id/text`                 | Admin; `title,description,connectionInfo,reason`; audited correction.                              |
| POST   | `/challenges/:id/publish-practice`     | Admin; publish event-only content after relevant events finish; audited.                           |
| POST   | `/challenges/:id/resources`            | Admin or owning Author before release; multipart `file` and optional `label`.                      |
| DELETE | `/resources/:id`                       | Admin or owning Author before release.                                                             |
| GET    | `/resources/:id/download`              | Authorized attachment download; optional `eventId`.                                                |
| POST   | `/challenges/:id/submissions`          | Eligible competitor; `flag,eventId?`.                                                              |
| POST   | `/challenges/:id/hints/:hintId/unlock` | Eligible competitor; optional `eventId` body; fixed cost recorded once.                            |

Challenge forms use `title,description,category,difficulty,basePoints,visibility,flag,connectionInfo,hints,links`. The replacement flag is optional when editing. Hints contain `content,cost`; links contain `label,url` and require HTTPS. File uploads occur after a draft exists.

Catalog filters: `search,category,difficulty,visibility,status,authorId,minPoints,maxPoints,minSolves,maxSolves,solved,used,eventId,view`. Sorting uses `sortBy` (`createdAt`, `points`, `solveCount`, `title`) and `sortOrder` (`asc`, `desc`). Boolean filters use `true` or `false` query strings. The server whitelists sort expressions.

Submission results use `correct`, `incorrect`, or `already_solved`, plus awarded points, remaining attempts, and lockout time. Requests during lockout return an error. Event-only challenge content is available to registered competitors only during an active event; Admins and the owning Author retain management access.

## Events and results

`GET /leaderboard/history` accepts `eventId?` and `players?` (a comma-separated list of at most six UUIDs). It returns selected players, cumulative timestamped points, the current player's standing and whether an event is live. Default selection is the top five plus the viewer when ranked. Event access follows the normal registered-participant/Admin checks. `GET /leaderboard` also accepts `search`, preserving overall ranks when filtering by display name.

| Method | Path                      | Access / purpose                                                                                 |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/events`                 | Non-draft event list; Admin may include drafts. `scope` is `all`, `upcoming`, `live`, or `past`. |
| GET    | `/events/:id`             | Event information, registration state, permitted challenge IDs.                                  |
| POST   | `/events`                 | Admin; create draft/scheduled event.                                                             |
| PUT    | `/events/:id`             | Admin; edit before start.                                                                        |
| POST   | `/events/:id/join`        | Player/Author; optional `code` for invite-only events.                                           |
| POST   | `/events/:id/rotate-code` | Admin; `code,reason`; replace invite code.                                                       |
| POST   | `/events/:id/archive`     | Admin; `reason`; archive draft or ended event.                                                   |
| GET    | `/events/:id/attendance`  | Admin; paged registrations and first-submission attendance.                                      |
| GET    | `/leaderboard`            | Practice ranking or registered event ranking via `eventId`; results remain available after end.  |

Event forms use `title,description,rules,startsAt,endsAt,status,access,joinCode,dynamicScoring,challengeIds`. Creation/editing validates approved challenge selection. Dynamic scoring defaults off. Registration does not count as attendance; the first validly processed correct or incorrect event submission does.

## Reviews, dashboards, and administration

| Method | Path                          | Access / purpose                                                                    |
| ------ | ----------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/challenges/:id/reviews`     | Paged visible reviews; Admin can inspect hidden records.                            |
| GET    | `/challenges/:id/my-review`   | Current user's review and cross-context solve eligibility.                          |
| PUT    | `/challenges/:id/review`      | Eligible solver; `rating,comment`; create or replace own review.                    |
| DELETE | `/challenges/:id/review`      | Delete own review.                                                                  |
| POST   | `/reviews/:id/hide`           | Admin; `reason`; hide with audit record.                                            |
| GET    | `/dashboard`                  | Role-specific statistics, events, activity, history, hints and work queue.          |
| GET    | `/dashboard/activity`         | Own submissions; Admin can view all.                                                |
| GET    | `/dashboard/author-analytics` | Per-challenge statistics for the current author.                                    |
| GET    | `/admin/users`                | Admin; paged accounts.                                                              |
| POST   | `/admin/users`                | Admin; `username,email,role`; Author/Admin account and one-time temporary password. |
| PATCH  | `/admin/users/:id`            | Admin; `role,isSuspended,reason`; protects final active Admin.                      |
| GET    | `/admin/audit`                | Admin; paged security/moderation records.                                           |
| GET    | `/admin/solves`               | Admin; paged retained awards and invalidations.                                     |
| PATCH  | `/admin/solves/:id`           | Admin; `points,invalidated,reason`; audited score correction.                       |

For the exact dynamic-scoring and hint rules, see [architecture](architecture.md). API access is not a hosted challenge runtime; connection instructions and external asset links are author-provided content.

Admin-created accounts may have the Player, Author or Admin role. All receive a one-time temporary password and must replace it before using feature endpoints. Duplicate normalized email addresses are rejected by validation and a database uniqueness constraint.
