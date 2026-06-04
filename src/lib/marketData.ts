import YahooFinance from 'yahoo-finance2';

// Single instance: it caches the Yahoo cookie/crumb across calls.
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  name: string | null;
}

function collect(out: Map<string, Quote>, q: unknown): void {
  if (!q || typeof q !== 'object') return;
  const r = q as {
    symbol?: string;
    regularMarketPrice?: number;
    currency?: string;
    shortName?: string;
    longName?: string;
  };
  if (!r.symbol || typeof r.regularMarketPrice !== 'number') return;
  const symbol = r.symbol.toUpperCase();
  out.set(symbol, {
    symbol,
    price: r.regularMarketPrice,
    currency: r.currency ?? 'USD',
    name: r.shortName ?? r.longName ?? null,
  });
}

/**
 * Fetch live quotes for a set of ticker symbols, keyed by uppercase symbol.
 * A bad ticker never fails the whole batch — it just won't appear in the map.
 */
export async function fetchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return out;

  try {
    const results = await yf.quote(unique);
    for (const q of Array.isArray(results) ? results : [results]) collect(out, q);
  } catch {
    // One invalid symbol can reject the batch; retry each on its own.
    for (const s of unique) {
      try {
        const q = await yf.quote(s);
        collect(out, Array.isArray(q) ? q[0] : q);
      } catch {
        // skip unresolvable symbol
      }
    }
  }

  return out;
}
