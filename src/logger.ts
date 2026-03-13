// Thin wrapper — Fastify has its own logger, but we also write structured logs
// for rejected events and async processing errors.

export function logInfo(context: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: 'info', context, ...data, ts: new Date().toISOString() }));
}

export function logError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ level: 'error', context, message, stack, ...extra, ts: new Date().toISOString() }));
}

export function logRejected(context: string, data: Record<string, unknown>): void {
  // These go to stdout with a "rejected" level so they can be filtered/alerted separately
  console.log(JSON.stringify({ level: 'rejected', context, ...data, ts: new Date().toISOString() }));
}
