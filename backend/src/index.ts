import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env, parseAllowedOrigins } from './env.js'
import { registerGenerateRoutes } from './routes/generate.js'
import { registerBootstrapRoutes } from './routes/bootstrap.js'
import { registerSportPlanRoutes } from './routes/sportPlans.js'
import { registerAthleteGraphRoutes } from './routes/athleteGraphs.js'
import { registerAthleteStateRoutes } from './routes/athleteState.js'
import { registerImportLegacyRoutes } from './routes/importLegacy.js'

const app = Fastify({
  logger: { level: env.LOG_LEVEL },
  // Graph payloads can get large once the AI fills them in.
  bodyLimit: 8 * 1024 * 1024,
})

const allowedOrigins = parseAllowedOrigins()
await app.register(cors, {
  origin: allowedOrigins === true ? true : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: false,
})

app.get('/healthz', async () => ({ ok: true }))

await registerGenerateRoutes(app)
await registerBootstrapRoutes(app)
await registerSportPlanRoutes(app)
await registerAthleteGraphRoutes(app)
await registerAthleteStateRoutes(app)
await registerImportLegacyRoutes(app)

try {
  await app.listen({ host: '0.0.0.0', port: env.PORT })
  app.log.info(`FrontierOS API listening on :${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
