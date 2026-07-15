import { performance } from 'node:perf_hooks';

const target = process.env.LOAD_TEST_URL ?? 'http://127.0.0.1:3010/api/health';
const requestCount = Math.max(1, Number(process.env.LOAD_TEST_REQUESTS ?? '100'));
const concurrency = Math.max(1, Math.min(requestCount, Number(process.env.LOAD_TEST_CONCURRENCY ?? '5')));
const latencies = [];
const statuses = new Map();
let nextRequest = 0;

async function worker() {
  while (nextRequest < requestCount) {
    nextRequest += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(target, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'ru-RU,ru;q=0.9',
          'user-agent': 'Mozilla/5.0 pumbum-load-check/1.0',
        },
      });
      await response.arrayBuffer();
      const elapsed = performance.now() - startedAt;
      latencies.push(elapsed);
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    } catch {
      const elapsed = performance.now() - startedAt;
      latencies.push(elapsed);
      statuses.set(0, (statuses.get(0) ?? 0) + 1);
    }
  }
}

function percentile(values, fraction) {
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1));
  return values[index];
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const totalMs = performance.now() - startedAt;
latencies.sort((a, b) => a - b);

const result = {
  target,
  requestCount,
  concurrency,
  statuses: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)),
  durationMs: Math.round(totalMs),
  requestsPerSecond: Number((requestCount / (totalMs / 1000)).toFixed(2)),
  latencyMs: {
    min: Math.round(latencies[0]),
    p50: Math.round(percentile(latencies, 0.5)),
    p95: Math.round(percentile(latencies, 0.95)),
    max: Math.round(latencies[latencies.length - 1]),
  },
};

console.log(JSON.stringify(result, null, 2));
if (statuses.size !== 1 || statuses.get(200) !== requestCount) process.exitCode = 1;
