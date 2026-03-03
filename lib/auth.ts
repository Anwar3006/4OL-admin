import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
    })
  : undefined;

if (!databaseUrl) {
  console.warn(
    "[BetterAuth] DATABASE_URL is missing. Set it in .env.local to use local /api/auth server routes.",
  );
}

export const auth = betterAuth({
  database: pool,

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      banned: {
        type: "boolean",
        defaultValue: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url }) => {
        console.log(
          `Email change verification for ${user.email} to ${newEmail}`,
        );
        console.log(`Verification URL: ${url}`);
      },
    },
    // Map Better Auth camelCase fields → snake_case DB columns
    fields: {
      createdAt: "created_at",
      updatedAt: "updated_at",
      emailVerified: "email_verified",
    },
  },

  account: {
    // Map Better Auth camelCase fields → snake_case DB columns
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  session: {
    // Map Better Auth camelCase fields → snake_case DB columns
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  verification: {
    // Map Better Auth camelCase fields → snake_case DB columns
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",

  trustedOrigins: [
    "http://localhost:3000",
    "https://office.4ourlife.com",
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],

  plugins: [nextCookies(), admin()],
});

export type Session = typeof auth.$Infer.Session;
