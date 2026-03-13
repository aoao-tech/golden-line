// ─── Zendesk webhook payload ──────────────────────────────────────────────────

export interface ZendeskWebhookPayload {
  customer_id: string;
  restaurant_id: string;
  source_ticket_id: string;
  case_data: string; // complaint transcript
}

// ─── Wolt webhook payload ─────────────────────────────────────────────────────

export interface WoltWebhookPayload {
  customer_id: string;
  restaurant_id: string;
  order_id: string;
}

// ─── Base44 AI response ───────────────────────────────────────────────────────

export type ActionCode = 'SPILL' | 'SOGGY' | 'THERMAL' | 'STABILITY' | 'MISSING';

export interface GoldenLineAnalyzerResponse {
  is_operational: boolean;
  action_code: ActionCode;
  golden_line_hebrew: string;
  reasoning_logic: string;
  evidence_quote: string;
  confidence_score: number;
}

// ─── Base44 DB rows ───────────────────────────────────────────────────────────

export interface OperationalDebt {
  customer_id: string;
  restaurant_id: string;
  is_active: boolean;
  action_code: ActionCode;
  golden_line_hebrew: string;
  failed_items?: string;
  reasoning_logic: string;
  evidence_quote: string;
  confidence_score: number;
  injected_count: number;
  source_ticket_id: string;
}

export interface InjectionEvent {
  debt_id: string;
  order_id: string;
  outcome: 'success' | 'failure';
  error_message?: string;
  injected_at: string;
}
