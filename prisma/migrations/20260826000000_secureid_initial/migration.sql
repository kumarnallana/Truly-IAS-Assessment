CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE');
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS', 'AUTHENTICATOR');
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION_EMAIL', 'REGISTRATION_SMS', 'MFA_VERIFY_SMS', 'MFA_VERIFY_EMAIL', 'MFA_TOTP_SETUP', 'MFA_TOTP_VERIFY', 'LOGIN_EMAIL', 'LOGIN_SMS');
CREATE TYPE "MfaMethod" AS ENUM ('AUTHENTICATOR', 'SMS', 'EMAIL');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "MfaMethod",
    "totpSecretEncrypted" TEXT,
    "lastTotpCounter" INTEGER,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "otpHash" TEXT NOT NULL,
    "testOtpEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginTransaction" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedMethod" "MfaMethod",
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "OtpChallenge_userId_channel_purpose_idx" ON "OtpChallenge"("userId", "channel", "purpose");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
CREATE UNIQUE INDEX "LoginTransaction_tokenHash_key" ON "LoginTransaction"("tokenHash");
CREATE INDEX "LoginTransaction_userId_expiresAt_idx" ON "LoginTransaction"("userId", "expiresAt");
CREATE INDEX "LoginTransaction_expiresAt_idx" ON "LoginTransaction"("expiresAt");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "AccessToken_userId_expiresAt_idx" ON "AccessToken"("userId", "expiresAt");
CREATE INDEX "AccessToken_sessionId_idx" ON "AccessToken"("sessionId");
CREATE INDEX "AccessToken_expiresAt_idx" ON "AccessToken"("expiresAt");

ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginTransaction" ADD CONSTRAINT "LoginTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

