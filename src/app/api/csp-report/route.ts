const maxReportBytes = 16 * 1024;

function safeText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength) || undefined;
}

function safeUrl(value: unknown): string | undefined {
  const text = safeText(value, 2048);
  if (!text) return undefined;
  if (text === 'inline' || text === 'eval' || text === 'data' || text === 'blob') return text;
  try {
    const url = new URL(text);
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 1000);
  } catch {
    return text.slice(0, 500);
  }
}

function normalizeReport(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const report = root['csp-report'] && typeof root['csp-report'] === 'object'
    ? root['csp-report'] as Record<string, unknown>
    : root;

  return {
    documentUri: safeUrl(report['document-uri'] ?? report.documentURL ?? report.url),
    blockedUri: safeUrl(report['blocked-uri'] ?? report.blockedURL),
    effectiveDirective: safeText(report['effective-directive'] ?? report.effectiveDirective, 120),
    violatedDirective: safeText(report['violated-directive'] ?? report.violatedDirective, 200),
    sourceFile: safeUrl(report['source-file'] ?? report.sourceFile),
    lineNumber: typeof report['line-number'] === 'number' ? report['line-number'] : undefined,
    columnNumber: typeof report['column-number'] === 'number' ? report['column-number'] : undefined,
    disposition: safeText(report.disposition, 30),
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxReportBytes) {
    return new Response(null, { status: 413 });
  }

  const body = await request.text();
  if (body.length > maxReportBytes) return new Response(null, { status: 413 });

  try {
    const payload = JSON.parse(body) as unknown;
    const reports = Array.isArray(payload) ? payload.slice(0, 10) : [payload];
    for (const item of reports) {
      const report = normalizeReport(item);
      if (report) console.warn('[csp-report]', JSON.stringify(report));
    }
  } catch {
    console.warn('[csp-report]', JSON.stringify({ malformed: true }));
  }

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
