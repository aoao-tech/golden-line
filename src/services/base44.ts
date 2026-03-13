import axios from 'axios';
import { config } from '../config';
import { logError } from '../logger';
import type {
  GoldenLineAnalyzerResponse,
  ActionCode,
  OperationalDebt,
} from '../types';

const VALID_ACTION_CODES: ActionCode[] = ['SPILL', 'SOGGY', 'THERMAL', 'STABILITY', 'MISSING'];

const http = axios.create({
  baseURL: config.base44.baseUrl,
  headers: {
    Authorization: `Bearer ${config.base44.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// ─── AI Agent ─────────────────────────────────────────────────────────────────

export async function callGoldenLineAnalyzer(
  transcript: string,
): Promise<GoldenLineAnalyzerResponse> {
  const response = await http.post<GoldenLineAnalyzerResponse>(
    '/agents/GoldenLineAnalyzer/run',
    { transcript },
  );
  return response.data;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateAnalyzerResponse(raw: unknown): GoldenLineAnalyzerResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response is not an object');
  }

  const r = raw as Record<string, unknown>;

  if (typeof r['is_operational'] !== 'boolean') {
    throw new Error('Missing or invalid field: is_operational');
  }
  if (!VALID_ACTION_CODES.includes(r['action_code'] as ActionCode)) {
    throw new Error(`Invalid action_code: ${r['action_code']}`);
  }
  if (typeof r['golden_line_hebrew'] !== 'string' || r['golden_line_hebrew'].trim() === '') {
    throw new Error('Missing or empty field: golden_line_hebrew');
  }
  if (typeof r['reasoning_logic'] !== 'string') {
    throw new Error('Missing field: reasoning_logic');
  }
  if (typeof r['evidence_quote'] !== 'string') {
    throw new Error('Missing field: evidence_quote');
  }
  if (
    typeof r['confidence_score'] !== 'number' ||
    r['confidence_score'] < 0 ||
    r['confidence_score'] > 1
  ) {
    throw new Error(`confidence_score out of range: ${r['confidence_score']}`);
  }

  return r as unknown as GoldenLineAnalyzerResponse;
}

// ─── operational_debts table ──────────────────────────────────────────────────

export async function findDebtByTicket(
  sourceTicketId: string,
): Promise<OperationalDebt | null> {
  try {
    const response = await http.get<OperationalDebt[]>('/tables/operational_debts', {
      params: { source_ticket_id: sourceTicketId },
    });
    return response.data[0] ?? null;
  } catch (err) {
    logError('base44.findDebtByTicket', err, { sourceTicketId });
    throw err;
  }
}

export async function createOperationalDebt(debt: Omit<OperationalDebt, 'injected_count'>): Promise<void> {
  await http.post('/tables/operational_debts', { ...debt, injected_count: 0, is_active: true });
}

export async function findActiveDebt(
  customerId: string,
  restaurantId: string,
): Promise<(OperationalDebt & { id: string }) | null> {
  try {
    const response = await http.get<(OperationalDebt & { id: string })[]>(
      '/tables/operational_debts',
      { params: { customer_id: customerId, restaurant_id: restaurantId, is_active: true } },
    );
    return response.data[0] ?? null;
  } catch (err) {
    logError('base44.findActiveDebt', err, { customerId, restaurantId });
    throw err;
  }
}

// ─── injection_events table ───────────────────────────────────────────────────

export async function createInjectionEvent(event: {
  debt_id: string;
  order_id: string;
  outcome: 'success' | 'failure';
  error_message?: string;
}): Promise<void> {
  try {
    await http.post('/tables/injection_events', {
      ...event,
      injected_at: new Date().toISOString(),
    });
  } catch (err) {
    logError('base44.createInjectionEvent', err, { event });
    // Do not rethrow — logging failure must never crash the main flow
  }
}
