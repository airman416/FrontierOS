import 'dotenv/config'

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return v
}

function optional(name: string, fallback: string): string {
  const v = process.env[name]
  return v && v.trim() !== '' ? v : fallback
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_URL_MIGRATION: process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL!,

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
  OPENROUTER_MODEL: optional('OPENROUTER_MODEL', 'google/gemini-2.5-flash'),
  HTTP_REFERER: optional('HTTP_REFERER', 'https://frontier-os.netlify.app'),
  OPENROUTER_APP_TITLE: optional('OPENROUTER_APP_TITLE', 'Frontier OS'),

  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', '*'),

  DEFAULT_COACH_ID: optional('DEFAULT_COACH_ID', '00000000-0000-0000-0000-000000000001'),

  PORT: Number(optional('PORT', '8080')),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
  NODE_ENV: optional('NODE_ENV', 'development'),
} as const

export function parseAllowedOrigins(): string[] | true {
  const raw = env.ALLOWED_ORIGINS.trim()
  if (raw === '*' || raw === '') return true
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
