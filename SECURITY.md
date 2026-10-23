# Security Policy

## Supported versions

Only the latest commit on `main` receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report it privately through GitHub: **Security → Report a vulnerability** on this repository
([private vulnerability reporting](https://github.com/Sero3105/studyOS/security/advisories/new)).

Include, if you can:

- what is affected (endpoint, page, configuration);
- steps to reproduce or a proof of concept;
- the impact you expect (data exposure, account takeover, …).

You will get an answer within 7 days. Once a fix is released you will be credited in the advisory, unless you prefer otherwise.

## Scope

In scope: the backend API, the frontend, the Docker/nginx configuration in this repository.

Out of scope: deployments you run yourself with a weak `SECRET_KEY`, without HTTPS in production, or with ports exposed beyond what `compose.yaml` publishes.

## Security design (summary)

- Passwords hashed with argon2; login rate-limited by nginx; constant-time response for unknown emails.
- Short-lived JWT access tokens in memory; refresh tokens are opaque, stored hashed, rotated on use, with reuse detection and CSRF protection.
- Share links are random 256-bit tokens stored only as hashes and expose a reduced, read-only view.
- Containers run read-only, as non-root, with all capabilities dropped; only nginx is published, on `127.0.0.1`.
