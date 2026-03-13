import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logInfo, logError, logRejected } from '../logger';
import {
  callGoldenLineAnalyzer,
  validateAnalyzerResponse,
  findDebtByTicket,
  createOperationalDebt,
} from '../services/base44';
import type { ZendeskWebhookPayload } from '../types';

// ─── Schema for request body validation ──────────────────────────────────────

const zendeskSchema = {
  body: {
    type: 'object',
    required: ['customer_id', 'restaurant_id', 'source_ticket_id', 'case_data'],
    properties: {
      customer_id:     { type: 'string', minLength: 1 },
      restaurant_id:   { type: 'string', minLength: 1 },
      source_ticket_id:{ type: 'string', minLength: 1 },
      case_data:       { type: 'string', minLength: 1 },
    },
    additionalProperties: true,
  },
} as const;

// ─── Async processing ─────────────────────────────────────────────────────────

async function processZendeskTicket(payload: ZendeskWebhookPayload): Promise<void> {
  const { customer_id, restaurant_id, source_ticket_id, case_data } = payload;

  logInfo('zendesk.process.start', { source_ticket_id, customer_id, restaurant_id });

  // 1. Call GoldenLineAnalyzer AI agent
  let rawResponse: unknown;
  try {
    rawResponse = await callGoldenLineAnalyzer(case_data);
  } catch (err) {
    logError('zendesk.process.aiCall', err, { source_ticket_id });
    return;
  }

  // 2. Validate AI response
  let analysis;
  try {
    analysis = validateAnalyzerResponse(rawResponse);
  } catch (err) {
    logError('zendesk.process.validation', err, { source_ticket_id, rawResponse });
    return;
  }

  // 3. Drop non-operational complaints
  if (!analysis.is_operational) {
    logRejected('zendesk.process.notOperational', {
      source_ticket_id,
      customer_id,
      restaurant_id,
      action_code: analysis.action_code,
      reasoning_logic: analysis.reasoning_logic,
      confidence_score: analysis.confidence_score,
    });
    return;
  }

  // 4. Idempotency — check if this ticket was already processed
  let existing;
  try {
    existing = await findDebtByTicket(source_ticket_id);
  } catch (err) {
    logError('zendesk.process.idempotencyCheck', err, { source_ticket_id });
    return;
  }

  if (existing) {
    logInfo('zendesk.process.duplicate', { source_ticket_id, message: 'ticket already processed, skipping' });
    return;
  }

  // 5. Save to operational_debts
  try {
    await createOperationalDebt({
      customer_id,
      restaurant_id,
      is_active: true,
      action_code: analysis.action_code,
      golden_line_hebrew: analysis.golden_line_hebrew,
      reasoning_logic: analysis.reasoning_logic,
      evidence_quote: analysis.evidence_quote,
      confidence_score: analysis.confidence_score,
      source_ticket_id,
    });
    logInfo('zendesk.process.saved', { source_ticket_id, action_code: analysis.action_code });
  } catch (err) {
    logError('zendesk.process.save', err, { source_ticket_id });
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export async function zendeskRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/webhooks/zendesk',
    { schema: zendeskSchema },
    async (request: FastifyRequest<{ Body: ZendeskWebhookPayload }>, reply: FastifyReply) => {
      // Respond 202 immediately — fire-and-forget
      reply.code(202).send({ received: true });

      // Process async without awaiting
      processZendeskTicket(request.body).catch((err) => {
        logError('zendesk.unhandled', err, { body: request.body });
      });
    },
  );
}
