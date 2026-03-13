# Golden Line — Backend

Automated kitchen instruction injection for restaurant delivery operations.

## Architecture

```
Zendesk (closed ticket) → POST /webhooks/zendesk → GoldenLineAnalyzer AI → operational_debts table
Wolt (new order)        → POST /webhooks/wolt    → operational_debts lookup → inject kitchen_notes
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable          | Required | Description                              |
|-------------------|----------|------------------------------------------|
| `PORT`            | No       | Server port (default: 3000)              |
| `BASE44_API_KEY`  | Yes      | Your Base44 API key                      |
| `BASE44_BASE_URL` | Yes      | Base44 API base URL                      |
| `WOLT_API_KEY`    | Phase 2  | Wolt Partner API key                     |
| `WOLT_BASE_URL`   | Phase 2  | Wolt Partner API base URL                |

### 3. Run locally

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm start
```

## Endpoints

### `POST /webhooks/zendesk`

Receives a closed Zendesk ticket. Responds `202` immediately.

**Body:**
```json
{
  "customer_id": "string",
  "restaurant_id": "string",
  "source_ticket_id": "string",
  "case_data": "full complaint transcript"
}
```

**Async flow:**
1. Calls `GoldenLineAnalyzer` AI agent with `case_data`
2. Validates the response
3. If `is_operational: false` → logs to `rejected` level and drops
4. If `is_operational: true` → checks `source_ticket_id` for duplicate → saves to `operational_debts`

### `POST /webhooks/wolt` *(Phase 2 — not yet implemented)*

### `GET /health`

Returns `{ status: "ok" }`. Used by Railway health checks.

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway
3. Set environment variables in Railway dashboard
4. Railway uses `railway.json` — build runs `npm run build && npm start`

## Logs

All logs are structured JSON to stdout. Key log levels:
- `info` — normal flow events
- `error` — failures in external API calls
- `rejected` — non-operational tickets dropped by AI (expected, not errors)
