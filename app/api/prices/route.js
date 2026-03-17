import { NextResponse } from "next/server";
function toYahooSymbol(sym, exchange) {
  if (sym === "BTC") return "BTC-CAD";
  if (sym === "ETH") return "ETH-CAD";
  if (sym === "KILO.B") return "KILO-B.TO";
  if (["TSX", "XTSE", "CBOE CANADA", "NEOE"].includes(exchange)) return sym + ".TO";
  return sym;
}
export async function POST(request) {
  try {
    const { holdings } = await request.json();
    if (!holdings || !Array.isArray(holdings)) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    const symbolMap = {};
    holdings.forEach((h) => { symbolMap[h.sym] = toYahooSymbol(h.sym, h.exchange || ""); });
    const yahooSymbols = [...new Set(Object.values(symbolMap))].join(",");
    const res = await fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=" + encodeURIComponent(yahooSymbols), { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];
    const quoteMap = {};
    quotes.forEach((q) => { quoteMap[q.symbol] = { price: q.regularMarketPrice, currency: q.currency, change: q.regularMarketChangePercent }; });
    const prices = {};
    Object.entries(symbolMap).forEach(([orig, ySym]) => { if (quoteMap[ySym]) prices[orig] = quoteMap[ySym]; });
    return NextResponse.json({ prices, fetchedAt: new Date().toISOString() });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
