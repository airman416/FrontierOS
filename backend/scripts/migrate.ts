import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const url = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL(_MIGRATION) is required')
  process.exit(1)
}

const client = postgres(url, { max: 1, prepare: false })
const db = drizzle(client)

await migrate(db, { migrationsFolder: './migrations' })
console.log('Migrations applied.')
await client.end()
