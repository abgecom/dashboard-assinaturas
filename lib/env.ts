import { z } from 'zod';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAGARME_SECRET_KEY: z.string().min(1),
  PAGARME_WEBHOOK_SECRET: z.string().optional().default(''),
  PAGARME_API_BASE_URL: z.string().url().default('https://api.pagar.me/core/v5'),
  CRON_SECRET: z.string().min(1),
  ADMIN_EMAIL: z.string().email().default('petloobrasil@gmail.com'),
  ADMIN_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PAGARME_SECRET_KEY: process.env.PAGARME_SECRET_KEY,
    PAGARME_WEBHOOK_SECRET: process.env.PAGARME_WEBHOOK_SECRET,
    PAGARME_API_BASE_URL: process.env.PAGARME_API_BASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });
}
