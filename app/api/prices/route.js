import { NextResponse } from "next/server";

function toYahooSymbol(sym, exchange) {
  if (sym === "BTC") return "BTC-CAD";
  if (sym === "ETH") return "ETH-CAD";
  if (sym === "KILO.B") return "KILO-B.TO";
  if (["TSX", "XTSE", "CBOE CANADA", "NEOE"].includes(exchange)) return sym + ".TO";
  return sym;
}

async function fetchV8Price(yahooSymbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = prevClose ? ((price - prevClose) / prevClose) * 100 : null;
    return {
      price,
      currency: meta.currency || "CAD",
      change,
    };
  } catch (e) {
    console.error(`Failed to fetch ${yahooSymbol}:`, e.message);
    return null;
  }
}

export async function POST(request) {
  try {
    const { holdings } = await request.json();
    if (!holdings || !Array.isArray(holdings))
      return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const symbolMap = {};
    holdings.forEach((h) => {
      symbolMap[h.sym] = toYahooSymbol(h.sym, h.exchange || "");
    });

    const uniqueYahoo = [...new Set(Object.values(symbolMap))];

    // Fetch all symbols in parallel using v8 chart endpoint
    const results = await Promise.allSettled(
      uniqueYahoo.map(async (ySym) => ({ symbol: ySym, data: await fetchV8Price(ySym) }))
    );

    const quoteMap = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.data) {
        quoteMap[r.value.symbol] = r.value.data;
      }
    });

    const prices = {};
    Object.entries(symbolMap).forEach(([orig, ySym]) => {
      if (quoteMap[ySym]) prices[orig] = quoteMap[ySym];
    });

    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
