# SecureID IAM Authentication & Registration

SecureID implements the supplied two-part assessment using vanilla HTML/CSS/JavaScript, Node.js/Express, Prisma/PostgreSQL, Playwright, server-side sessions, backend OTP/TOTP MFA, and a separate short-lived JWT protected-API demonstration.

## Run locally

1. Copy `.env.example` to `.env` and replace every placeholder, especially `DATABASE_URL`, `OTP_SECRET`, `TOTP_ENCRYPTION_KEY`, and `JWT_SECRET`.
2. Install dependencies with `npm install`.
3. Apply the schema with `npm run db:push` for an existing development database, or `npx prisma migrate deploy` for a fresh migration-managed database.
4. Start the full Express application with `npm start`.
5. Open `http://localhost:4000` for registration or `http://localhost:4000/login.html` for login.

Simulated email/SMS codes are printed only to the server console. Optional test-only retrieval is described in `.env.example` and the architecture contract.

## Verification

```text
npm run prisma:generate
npm run test:unit
npm run test:functional
npm test
```

The Playwright suite contains functional, accessibility, responsive, security, and multi-viewport visual regression coverage.

## Permanent project documentation

- [Part 2 architecture and security contract](docs/part-2-architecture-contract.md)
- [Corrected IAM video evidence review](docs/iam-video-evidence-review.md)
- [UI reference map](docs/ui-reference-map.md)
- [UI baseline policy](docs/ui-baseline-policy.md)

