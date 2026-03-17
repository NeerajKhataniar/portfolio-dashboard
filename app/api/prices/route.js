import yahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

// Map our symbols to Yahoo Finance format
function toYahooSymbol(sym, exchange) {
  if (sym === "BTC") return "BTC-CAD";
  if (sym === "ETH") return "ETH-CAD";
  if (sym === "KILO.B") return "KILO-B.TO";
  // TSX / CBOE Canada listed
  if (["TSX", "CBOE CANADA"].includes(exchange) || ["XTSE", "NEOE"].includes(exchange)) {
    return sym + ".TO";
  }
  // US-listed
  return sym;
}

export async function POST(request) {
  try {
    const { holdings } = await request.json();
    if (!holdings || !Array.isArray(holdings)) {
      return NextResponse.json({ error: "Invalid holdings" }, { status: 400 });
    }

    const symbolMap = {};
    holdings.forEach((h) => {
      const ySymbol = toYahooSymbol(h.sym, h.exchange || h.mic || "");
      symbolMap[h.sym] = ySymbol;
    });

    const uniqueYahooSymbols = [...new Set(Object.values(symbolMap))];

    // Fetch quotes in batches to avoid rate limits
    const batchSize = 10;
    const results = {};

    for (let i = 0; i < uniqueYahooSymbols.length; i += batchSize) {
      const batch = uniqueYahooSymbols.slice(i, i + batchSize);
      const promises = batch.map(async (ySym) => {
        try {
          const quote = await yahooFinance.quote(ySym);
          return { symbol: ySym, price: quote.regularMarketPrice, currency: quote.currency, change: quote.regularMarketChangePercent };
        } catch (e) {
          console.error(`Failed to fetch ${ySym}:`, e.message);
          return { symbol: ySym, price: null, currency: null, change: null };
        }
      });
      const batchResults = await Promise.all(promises);
      batchResults.forEach((r) => { results[r.symbol] = r; });
    }

    // Map back to original symbols
    const prices = {};
    Object.entries(symbolMap).forEach(([origSym, ySym]) => {
      if (results[ySym]) {
        prices[origSym] = {
          price: results[ySym].price,
          currency: results[ySym].currency,
          change: results[ySym].change,
        };
      }
    });

    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Price fetch error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
