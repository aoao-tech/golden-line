import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),

  base44: {
    apiKey: required('BASE44_API_KEY'),
    baseUrl: required('BASE44_BASE_URL'),
  },

  // Wolt config intentionally optional at startup — Phase 2 only
  wolt: {
    apiKey: optional('WOLT_API_KEY'),
    baseUrl: optional('WOLT_BASE_URL'),
  },
} as const;
