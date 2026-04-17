import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL(_MIGRATION) is required for drizzle-kit')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
