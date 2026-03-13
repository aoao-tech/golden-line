import 'dotenv/config';
import Fastify from 'fastify';
import { config } from './config';
import { zendeskRoutes } from './webhooks/zendesk';
import { logInfo, logError } from './logger';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

// ─── Health check ─────────────────────────────────────────────────────────────

fastify.get('/health', async (_request, reply) => {
  reply.send({ status: 'ok', ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

fastify.register(zendeskRoutes);
// Wolt routes will be registered here in Phase 2

// ─── Boot ─────────────────────────────────────────────────────────────────────

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    logInfo('server.start', { port: config.port });
  } catch (err) {
    logError('server.start', err);
    process.exit(1);
  }
};

start();
