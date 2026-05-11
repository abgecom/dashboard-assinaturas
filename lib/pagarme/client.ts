import { getServerEnv } from '@/lib/env';
import { PagarmeError, type PagarmeListResponse } from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  retries?: number;
  timeoutMs?: number;
}

function authHeader() {
  const { PAGARME_SECRET_KEY } = getServerEnv();
  return `Basic ${Buffer.from(`${PAGARME_SECRET_KEY}:`).toString('base64')}`;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const { PAGARME_API_BASE_URL } = getServerEnv();
  const url = new URL(`${PAGARME_API_BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function pagarmeRequest<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { retries = 3, timeoutMs = 30_000 } = options;
  const url = buildUrl(path, options.query);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[pagarme]', { method, url });
      }
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        const text = await res.text().catch(() => '');
        lastError = new PagarmeError(
          `Pagar.me ${res.status}: ${text || res.statusText}`,
          res.status,
          undefined,
          text,
        );
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await sleep(delay);
        attempt++;
        continue;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const msg =
          (payload as { message?: string }).message ||
          `Pagar.me ${res.status} ${res.statusText}`;
        throw new PagarmeError(msg, res.status, undefined, payload);
      }

      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof PagarmeError) throw err;
      lastError = err;
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await sleep(delay);
      attempt++;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new PagarmeError('Pagar.me request failed after retries', 0);
}

/**
 * Itera todas as páginas de um endpoint de listagem da Pagar.me.
 * Pagar.me v5 usa paginação por `page` (1-based) e `size` (max 100).
 */
export async function* paginate<T>(
  path: string,
  query?: RequestOptions['query'],
  pageSize = 100,
): AsyncGenerator<T> {
  let page = 1;
  while (true) {
    const response = await pagarmeRequest<PagarmeListResponse<T>>('GET', path, {
      query: { ...query, page, size: pageSize },
    });
    for (const item of response.data) yield item;
    if (!response.paging?.next || response.data.length < pageSize) break;
    page++;
  }
}
