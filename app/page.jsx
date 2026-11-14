"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Papa from "papaparse";

// STATIC DATA
const MER = {XEQT:0.20,WSRI:0.20,WSRD:0.22,WSGB:0.35,VCB:0.09,VCN:0.05,VDY:0.22,VEE:0.24,VIDY:0.22,VIU:0.22,VUN:0.16,VAB:0.09,VBG:0.22,VBU:0.22,VYM:0.06,VWOB:0.20,ZHY:0.40,ZFL:0.20,XST:0.61,XCH:0.67,CIF:0.62,OUNZ:0.25,GLDM:0.10,"KILO.B":0.23,BTC:null,ETH:null};

const CATEGORY_MAP = {CRYPTOCURRENCY:"crypto",EXCHANGE_TRADED_FUND:"ETF",STOCK:"stock",EQUITY:"stock"};
const FUND_CAT = {VAB:"bond",VBG:"bond",VBU:"bond",VCB:"bond",VWOB:"bond",ZHY:"bond",ZFL:"bond",WSGB:"bond",OUNZ:"gold",GLDM:"gold","KILO.B":"gold"};

const THEME_COLORS = {"AI":"#7F77DD","Energy":"#1D9E75","Defence":"#378ADD","Healthcare":"#D4537E","Fintech":"#534AB7","Infrastructure":"#EF9F27","Consumer":"#D85A30","Other":"#888"};
const THEME_LIST = Object.keys(THEME_COLORS);

const DEFAULT_GUARDRAILS = {maxPositionPct:5,maxThemePct:30,drawdownAlert:20};

const SECTOR_DATA = {
  XEQT:{Financials:21.0,Technology:20.0,Industrials:12.3,"Consumer cyclical":8.4,Materials:8.1,Healthcare:7.2,Energy:6.8,Communication:6.5,"Consumer defensive":4.7,Utilities:2.8,"Real estate":2.3},
  WSRI:{Technology:26.5,Financials:17.0,Healthcare:13.0,Industrials:11.0,"Consumer cyclical":9.0,"Consumer defensive":6.0,Communication:5.5,Energy:4.0,Materials:3.5,Utilities:2.5,"Real estate":2.0},
  WSRD:{Technology:30.0,Financials:12.0,Healthcare:10.0,Industrials:10.0,"Consumer cyclical":10.0,"Consumer defensive":8.0,Communication:6.0,Materials:5.0,Utilities:3.0,Energy:3.0,"Real estate":3.0},
  VUN:{Technology:29.5,Healthcare:12.8,Financials:12.7,"Consumer cyclical":10.5,Communication:9.1,Industrials:8.2,"Consumer defensive":5.8,Energy:3.6,Utilities:2.5,"Real estate":2.4,Materials:2.3},
  VIU:{Financials:19.3,Industrials:15.0,Healthcare:10.5,"Consumer cyclical":10.0,Technology:9.8,"Consumer defensive":8.5,Materials:7.0,Energy:5.5,Communication:4.5,Utilities:4.2,"Real estate":3.0},
  VCN:{Financials:35.0,Energy:13.5,Industrials:11.5,Materials:10.5,Technology:8.0,"Consumer cyclical":4.5,Communication:4.5,Utilities:4.0,"Consumer defensive":3.0,"Real estate":2.5,Healthcare:1.5},
  VDY:{Financials:50.0,Energy:16.0,Communication:10.0,Utilities:8.0,Industrials:5.0,"Consumer defensive":3.0,Materials:3.0,Technology:2.0,"Real estate":2.0,"Consumer cyclical":1.0},
  VEE:{Financials:22.0,Technology:18.0,Materials:8.0,"Consumer cyclical":12.0,Communication:10.0,Energy:6.0,Industrials:6.0,"Consumer defensive":5.0,Healthcare:4.0,Utilities:3.0,"Real estate":3.0},
};

const GEO_DATA = {
  XEQT:{Canada:26.8,US:42.3,"Intl developed":25.3,Emerging:5.6},
  WSRI:{Canada:5.0,US:85.0,"Intl developed":10.0},
  WSRD:{Canada:3.0,US:70.0,"Intl developed":20.0,Emerging:7.0},
  VUN:{US:100.0},VIU:{"Intl developed":100.0},VCN:{Canada:100.0},VDY:{Canada:100.0},
  VEE:{Emerging:100.0},VIDY:{"Intl developed":100.0},
  WSGB:{Canada:20.0,US:30.0,"Intl developed":30.0,Emerging:20.0},
};

const TOP_STOCKS = {
  XEQT:[{name:"Apple",ticker:"AAPL",pct:4.2},{name:"Microsoft",ticker:"MSFT",pct:3.8},{name:"Nvidia",ticker:"NVDA",pct:3.5},{name:"Amazon",ticker:"AMZN",pct:2.1},{name:"Meta",ticker:"META",pct:1.5},{name:"Alphabet",ticker:"GOOGL",pct:1.8},{name:"RBC",ticker:"RY.TO",pct:2.5},{name:"TD Bank",ticker:"TD.TO",pct:2.2},{name:"Shopify",ticker:"SHOP.TO",pct:1.8}],
  WSRI:[{name:"Microsoft",ticker:"MSFT",pct:5.2},{name:"Nvidia",ticker:"NVDA",pct:4.5},{name:"Apple",ticker:"AAPL",pct:4.0},{name:"Alphabet",ticker:"GOOGL",pct:3.0}],
  VUN:[{name:"Apple",ticker:"AAPL",pct:7.0},{name:"Microsoft",ticker:"MSFT",pct:6.5},{name:"Nvidia",ticker:"NVDA",pct:5.8},{name:"Amazon",ticker:"AMZN",pct:3.5}],
};

// Rough look-through data for newer holdings. Approximate: verify against fund fact sheets.
Object.assign(SECTOR_DATA, {
  ZEB:{Financials:100}, XST:{"Consumer defensive":100}, AAPL:{Technology:100},
  "CSH.UN":{"Real estate":100}, TNZ:{Energy:100}, STCK:{Financials:100},
  GLIX:{Utilities:50,Industrials:50},
});
Object.assign(GEO_DATA, {
  ZEB:{Canada:100}, XST:{Canada:100}, AAPL:{US:100}, "CSH.UN":{Canada:100}, TNZ:{Canada:100},
  STCK:{Global:100}, GLIX:{Global:100}, VYM:{US:100},
  VCB:{Canada:100}, VAB:{Canada:100}, VBU:{US:100}, VBG:{"Intl developed":100}, VWOB:{Emerging:100}, ZHY:{US:100},
});

// ===== TPA (total portfolio approach) =====
const ROLES = ["Core (reference)","Defensive / income","Real assets","Private-market proxy","Equity tilt","Single stock","Speculative option","Inflation hedge","Liquidity","Untagged"];
const DEFAULT_ROLES = {XEQT:"Core (reference)",INCOME:"Defensive / income",GLIX:"Real assets","CSH.UN":"Real assets",OUNZ:"Inflation hedge",GLDM:"Inflation hedge",STCK:"Private-market proxy",XST:"Equity tilt",ZEB:"Equity tilt",BTC:"Speculative option",ETH:"Speculative option",CASH:"Liquidity"};
const REPLACES = ["Global equity","Bonds","Cash","Nothing (added risk)","—"];
const NON_SATELLITE = ["Core (reference)","Liquidity","Defensive / income"];
// Illustrative risk assumptions (annual volatility and correlations). Placeholders, not estimated from data.
const RISK_VOL = {equity:0.15,bond:0.06,gold:0.15,crypto:0.60,stock:0.30,cash:0};
const RISK_SAME = {equity:0.85,bond:0.80,gold:1,crypto:0.80,stock:0.40,cash:0};
const RISK_CORR = {"bond|equity":0.2,"equity|gold":0.1,"crypto|equity":0.4,"equity|stock":0.65,"bond|gold":0.2,"bond|crypto":0.1,"bond|stock":0.15,"crypto|gold":0.1,"gold|stock":0.05,"crypto|stock":0.35};
// Policy limits default to the written policy. Dollar amounts default to 0: enter your own (stored in this browser only).
const DEFAULT_TPA = {satMaxPct:20,cryptoMaxPct:8,cryptoCapCad:0,cashMonthsMin:2,cashMonthsMax:3,monthlySpend:0,creditLimit:0,otherCash:0,ukPensionGbp:0,gbpCad:1.95,dbCommuted:0,workplaceDc:0,studentLoanGbp:0};

function NumIn({label,value,onChange,step=100,hint}){
  return <label style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
    <span style={{fontSize:12,color:"var(--text-secondary)"}}>{label}{hint&&<span style={{fontSize:10,color:"var(--text-tertiary)"}}> · {hint}</span>}</span>
    <input type="number" value={value} step={step} onChange={e=>onChange(e.target.value===""?"":+e.target.value)}
      style={{width:110,fontSize:12,padding:"3px 6px",textAlign:"right",background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text-primary)"}}/>
  </label>;
}
function Check({ok,label,detail}){
  const c = ok==null?"#888":ok?"#1D9E75":"#E24B4A";
  return <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
    <span style={{fontSize:10,padding:"2px 7px",borderRadius:"var(--radius)",background:c+"1a",color:c,fontWeight:500,whiteSpace:"nowrap",minWidth:54,textAlign:"center"}}>{ok==null?"NOT SET":ok?"OK":"BREACH"}</span>
    <span style={{fontSize:12,flex:1}}>{label}</span>
    <span style={{fontSize:12,fontWeight:500,textAlign:"right"}}>{detail}</span>
  </div>;
}

const STRESS = {
  recession:{name:"Recession",desc:"Broad equity decline, bonds rally, flight to safety.",impacts:{equity:-0.18,bond:0.04,gold:0.08,crypto:-0.35,stock:-0.22,cash:0,sectors:{Technology:-0.25,Financials:-0.20,"Consumer cyclical":-0.28,Industrials:-0.18,Materials:-0.15,Healthcare:-0.08,Communication:-0.15,"Consumer defensive":-0.05,Utilities:-0.05,Energy:-0.22,"Real estate":-0.20}}},
  rate_hike:{name:"Rate hike +100bps",desc:"Bonds fall, rate-sensitive equities drop, financials benefit.",impacts:{equity:-0.04,bond:-0.06,gold:-0.02,crypto:-0.08,stock:-0.05,cash:0,sectors:{Technology:-0.06,Utilities:-0.07,"Real estate":-0.08,Financials:0.02}}},
  inflation:{name:"Inflation spike",desc:"Real returns erode, commodities and gold benefit.",impacts:{equity:-0.06,bond:-0.08,gold:0.12,crypto:0.05,stock:-0.07,cash:-0.03,sectors:{Energy:0.08,Materials:0.06,Utilities:-0.05,"Consumer defensive":-0.04}}},
  tech_crash:{name:"Tech correction â25%",desc:"Tech-heavy sell-off, rotation to value.",impacts:{equity:-0.10,bond:0.02,gold:0.03,crypto:-0.20,stock:-0.12,cash:0,sectors:{Technology:-0.25,Communication:-0.15,"Consumer cyclical":-0.10,Financials:0.02}}},
  canada_housing:{name:"Canada housing crisis",desc:"Canadian banks and REITs impacted.",impacts:{equity:-0.05,bond:-0.02,gold:0.04,crypto:-0.05,stock:-0.06,cash:0,sectors:{Financials:-0.15,"Real estate":-0.25},geo:{Canada:-0.10}}},
  crypto_winter:{name:"Crypto winter â60%",desc:"Digital assets crash, minimal equity impact.",impacts:{equity:-0.01,bond:0.0,gold:0.02,crypto:-0.60,stock:-0.01,cash:0}},
  goldilocks:{name:"Goldilocks rally",desc:"Perfect macro: growth + low inflation + stable rates.",impacts:{equity:0.12,bond:0.02,gold:-0.03,crypto:0.25,stock:0.15,cash:0,sectors:{Technology:0.18,"Consumer cyclical":0.14,Industrials:0.10}}},
};

const fmt = n => n.toLocaleString("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:0,maximumFractionDigits:0});
const fmtD = n => n.toLocaleString("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2,maximumFractionDigits:2});
const pct = n => (n*100).toFixed(1)+"%";

// FIX #2: Added "cash" to asset class colors and labels
const CC = {equity:"#1D9E75",bond:"#378ADD",gold:"#EF9F27",crypto:"#7F77DD",stock:"#D85A30",cash:"#888"};
const CL = {equity:"Equity ETFs",bond:"Bond ETFs",gold:"Gold ETFs",crypto:"Crypto",stock:"Stocks",cash:"Cash"};
const SC = {"Financials":"#378ADD","Technology":"#7F77DD","Industrials":"#888","Consumer cyclical":"#D85A30","Materials":"#EF9F27","Healthcare":"#D4537E","Energy":"#1D9E75","Communication":"#534AB7","Consumer defensive":"#639922","Utilities":"#0F6E56","Real estate":"#854F0B"};
const GCC = {"Canada":"#E24B4A","US":"#378ADD","Intl developed":"#1D9E75","Emerging":"#EF9F27","Global":"#7F77DD"};

// FIX #2: Updated CSV parser to handle cash rows
function parseWealthsimpleCSV(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  return rows.map(r => {
    const sym = (r.Symbol || "").trim();
    const secType = r["Security Type"] || "";
    const mv = parseFloat(r["Market Value"]) || 0;
    const qty = parseFloat(r.Quantity) || 0;

    // Detect cash rows: no symbol but has a market value, or security type is empty/cash-like
    // Cash rows: Wealthsimple exports them as Symbol "CAD", Security Type "CURRENCY". A negative balance is the credit line.
    if (secType === "CURRENCY" && mv === 0) return null;
    if (secType === "CURRENCY" || (!sym && mv !== 0)) {
      return {
        sym: mv < 0 ? "LOAN" : "CASH", name: mv < 0 ? "Credit line drawn" : "Cash", acct: r["Account Name"] || "", acctType: r["Account Type"] || "",
        acctClass: r["Account Classification"] || "", acctNum: (r["Account Number"] || "").slice(0, 4),
        type: mv < 0 ? "debt" : "cash", category: mv < 0 ? "debt" : "cash", qty: mv, price: 1, pCurr: "CAD", mv, mvCurr: "CAD",
        book: mv, unreal: 0, unrealCurr: "CAD", exchange: "", mic: "", mer: null,
      };
    }

    if (!sym) return null; // skip truly empty rows

    const baseCat = CATEGORY_MAP[secType] || "ETF";
    const isStock = ["STOCK","EQUITY"].includes(secType) || (secType !== "CRYPTOCURRENCY" && secType !== "EXCHANGE_TRADED_FUND" && !FUND_CAT[sym] && secType !== "");
    const category = secType === "CRYPTOCURRENCY" ? "crypto" : isStock ? "stock" : (FUND_CAT[sym] || "equity");
    const mvCurr = r["Market Value Currency"] || "CAD";
    return {
      sym, name: r.Name || sym, acct: r["Account Name"] || "", acctType: r["Account Type"] || "", acctClass: r["Account Classification"] || "",
      acctNum: (r["Account Number"] || "").slice(0, 4), type: baseCat, category, qty,
      price: parseFloat(r["Market Price"]) || 0, pCurr: r["Market Price Currency"] || "CAD", mv, mvCurr,
      book: parseFloat(r["Book Value (CAD)"]) || 0, unreal: parseFloat(r["Market Unrealized Returns"]) || 0,
      unrealCurr: r["Market Unrealized Returns Currency"] || "CAD", exchange: r.Exchange || "", mic: r.MIC || "",
      mer: MER[sym] !== undefined ? MER[sym] : null,
    };
  }).filter(Boolean);
}

// FIX #4: Parse Wealthsimple activities CSV for DCA tracking
function parseActivitiesCSV(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const trades = {};
  parsed.data.forEach(r => {
    const actType = (r.activity_type || "").trim();
    const subType = (r.activity_sub_type || "").trim().toUpperCase();
    if (actType !== "Trade" || subType !== "BUY") return;
    const sym = (r.symbol || "").trim();
    if (!sym) return;
    const date = (r.transaction_date || "").trim();
    const qty = parseFloat(r.quantity) || 0;
    const price = parseFloat(r.unit_price) || 0;
    const total = Math.abs(parseFloat(r.net_cash_amount) || 0) || (qty * price);
    if (!trades[sym]) trades[sym] = [];
    trades[sym].push({ date, qty, price, total });
  });
  Object.values(trades).forEach(arr => arr.sort((a, b) => a.date.localeCompare(b.date)));
  return trades;
}

function computeDCA(tradeList) {
  if (!tradeList || tradeList.length === 0) return null;
  const totalQty = tradeList.reduce((a, t) => a + t.qty, 0);
  const totalCost = tradeList.reduce((a, t) => a + Math.abs(t.total), 0);
  const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
  const firstBuy = tradeList[0].date;
  const lastBuy = tradeList[tradeList.length - 1].date;
  return { totalQty, totalCost, avgPrice, firstBuy, lastBuy, buyCount: tradeList.length };
}

const s = {
  card: {background:"var(--bg-primary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"1rem 1.25rem"},
  th: {fontSize:11,fontWeight:500,color:"var(--text-secondary)",padding:"5px 6px",textAlign:"left",cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)",whiteSpace:"nowrap"},
  td: {fontSize:12,padding:"6px 6px",borderBottom:"0.5px solid var(--border)"},
  badge: c=>({fontSize:10,padding:"2px 7px",borderRadius:"var(--radius)",background:c+"1a",color:c,fontWeight:500,whiteSpace:"nowrap"}),
  sec: {fontSize:14,fontWeight:500,marginBottom:"0.7rem"},
  g: c=>({display:"grid",gridTemplateColumns:c,gap:12}),
};

function Donut({segments,size=148,t=24}){
  const r=(size-t)/2,cx=size/2,cy=size/2,ci=2*Math.PI*r;
  let o=0;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {segments.map((seg,i)=>{
      const d=seg.pct*ci,g=ci-d,off=o;o+=d;
      return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={t} strokeDasharray={`${d} ${g}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>;
    })}</svg>;
}

function Bar({segments,h=20}){
  return <div style={{display:"flex",borderRadius:"var(--radius)",overflow:"hidden",height:h,width:"100%"}}>
    {segments.filter(sg=>sg.pct>0.004).map((sg,i)=>
      <div key={i} style={{width:pct(sg.pct),background:sg.color,minWidth:sg.pct>0.015?2:0}} title={`${sg.label}: ${pct(sg.pct)}`}/>)}
  </div>;
}

function M({label,value,sub,color}){
  return <div style={{background:"var(--bg-secondary)",borderRadius:"var(--radius)",padding:"0.6rem 0.85rem",minWidth:0}}>
    <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>{label}</div>
    <div style={{fontSize:19,fontWeight:500,color:color||"var(--text-primary)"}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"var(--text-secondary)",marginTop:1}}>{sub}</div>}</div>;
}

export default function Page() {
  const [rawHoldings, setRawHoldings] = useState(null);
  const [livePrices, setLivePrices] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastPriceFetch, setLastPriceFetch] = useState(null);
  const [usdCad, setUsdCad] = useState(1.365);
  const [csvDate, setCsvDate] = useState(null);
  const [tab, setTab] = useState("overview");
  const [sortCol, setSortCol] = useState("mvCad");
  const [sortDir, setSortDir] = useState(-1);
  const [scenario, setScenario] = useState("recession");
  const [threshold, setThreshold] = useState(5);
  const [targets, setTargets] = useState({funds:75,stocks:25,crypto:0});
  const [subTargets, setSubTargets] = useState({equity:65,bond:20,gold:5});
  const [feeBudget, setFeeBudget] = useState(200);
  const [sectorTargets, setSectorTargets] = useState({Financials:20,Technology:18,Industrials:12,"Consumer cyclical":8,Materials:8,Healthcare:7,Energy:7,Communication:6,"Consumer defensive":5,Utilities:3,"Real estate":3});
  const [dragOver, setDragOver] = useState(false);
  const [guardrails, setGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [stockThemes, setStockThemes] = useState({});
  const [stockNotes, setStockNotes] = useState({});
  // FIX #4: Activities-based DCA data replaces stockBuyDates
  const [activitiesTrades, setActivitiesTrades] = useState({});
  // TPA: role tags, what each position replaces, and policy / balance-sheet inputs
  const [roles, setRoles] = useState({});
  const [replaces, setReplaces] = useState({});
  const [tpa, setTpa] = useState(DEFAULT_TPA);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio-settings");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.targets) setTargets(p.targets);
        if (p.subTargets) setSubTargets(p.subTargets);
        if (p.feeBudget) setFeeBudget(p.feeBudget);
        if (p.sectorTargets) setSectorTargets(p.sectorTargets);
        if (p.threshold) setThreshold(p.threshold);
        if (p.guardrails) setGuardrails(g => ({...DEFAULT_GUARDRAILS, ...p.guardrails}));
        if (p.stockThemes) setStockThemes(p.stockThemes);
        if (p.stockNotes) setStockNotes(p.stockNotes);
        if (p.activitiesTrades) setActivitiesTrades(p.activitiesTrades);
        if (p.roles) setRoles(p.roles);
        if (p.replaces) setReplaces(p.replaces);
        if (p.tpa) setTpa(t => ({...DEFAULT_TPA, ...p.tpa}));
      }
      const savedHoldings = localStorage.getItem("portfolio-holdings");
      if (savedHoldings) {
        const h = JSON.parse(savedHoldings);
        setRawHoldings(h.holdings);
        setCsvDate(h.date);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("portfolio-settings", JSON.stringify({targets,subTargets,feeBudget,sectorTargets,threshold,guardrails,stockThemes,stockNotes,activitiesTrades,roles,replaces,tpa})); } catch(e){}
  }, [targets, subTargets, feeBudget, sectorTargets, threshold, guardrails, stockThemes, stockNotes, activitiesTrades, roles, replaces, tpa]);

  useEffect(() => {
    if (rawHoldings) {
      try { localStorage.setItem("portfolio-holdings", JSON.stringify({holdings:rawHoldings,date:csvDate})); } catch(e){}
    }
  }, [rawHoldings, csvDate]);

  // Auto-refresh prices when dashboard loads with holdings
  useEffect(() => {
    if (rawHoldings && rawHoldings.length > 0 && !livePrices && !priceLoading) {
      fetchPrices();
    }
  }, [rawHoldings]);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Detect Wealthsimple activities CSV (has transaction_date header) vs holdings CSV
      const firstLine = text.split("\n")[0].toLowerCase();
      if (firstLine.includes("transaction_date") && firstLine.includes("activity_type")) {
        const trades = parseActivitiesCSV(text);
        if (Object.keys(trades).length > 0) {
          setActivitiesTrades(prev => ({...prev, ...trades}));
          setTab("stocks");
          return;
        }
      }
      // Regular holdings CSV
      const holdings = parseWealthsimpleCSV(text);
      if (holdings.length > 0) {
        setRawHoldings(holdings);
        const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        setCsvDate(dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0]);
        setTab("overview");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  }, [handleFile]);

  const fetchPrices = useCallback(async () => {
    if (!rawHoldings || priceLoading) return;
    setPriceLoading(true);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({holdings: rawHoldings.filter(h => h.category !== "cash" && h.category !== "debt").map(h => ({sym: h.sym, exchange: h.exchange || h.mic}))})
      });
      const data = await res.json();
      if (data.prices) {
        setLivePrices(data.prices);
        setLastPriceFetch(new Date().toLocaleTimeString());
      }
    } catch (e) { console.error("Price fetch failed:", e); }
    setPriceLoading(false);
  }, [rawHoldings, priceLoading]);

  const toCAD = useCallback((v, c) => c === "USD" ? v * usdCad : v, [usdCad]);

  const holdings = useMemo(() => {
    if (!rawHoldings) return [];
    return rawHoldings.filter(h => h.category !== "debt").map(h => {
      if (h.category === "cash") {
        return {...h, mvCad: h.mv, unrealCad: 0, annualFee: 0, change: null};
      }
      let price = h.price, pCurr = h.pCurr;
      if (livePrices && livePrices[h.sym] && livePrices[h.sym].price) {
        price = livePrices[h.sym].price;
        pCurr = livePrices[h.sym].currency || h.pCurr;
      }
      const mv = h.qty * price;
      const mvCad = toCAD(mv, pCurr);
      const bookCad = h.book;
      const unrealCad = mvCad - bookCad;
      const annualFee = h.mer != null ? (mvCad * h.mer / 100) : 0;
      return {...h, price, pCurr, mv, mvCad, unrealCad, annualFee, change: livePrices?.[h.sym]?.change || null};
    });
  }, [rawHoldings, livePrices, toCAD]);

  const totalCad = useMemo(() => holdings.reduce((a,h) => a+h.mvCad, 0), [holdings]);
  const totalUnreal = useMemo(() => holdings.reduce((a,h) => a+h.unrealCad, 0), [holdings]);
  const totalBook = useMemo(() => holdings.reduce((a,h) => a+h.book, 0), [holdings]);
  const totalFees = useMemo(() => holdings.reduce((a,h) => a+h.annualFee, 0), [holdings]);
  const wMER = useMemo(() => {const ev=holdings.filter(h=>h.mer!=null).reduce((a,h)=>a+h.mvCad,0);return ev>0?holdings.filter(h=>h.mer!=null).reduce((a,h)=>a+(h.mvCad/ev)*h.mer,0):0;}, [holdings]);

  const byCat = useMemo(()=>{const c={};holdings.forEach(h=>{c[h.category]=(c[h.category]||0)+h.mvCad;});return c;},[holdings]);
  const byAcct = useMemo(()=>{const a={};holdings.forEach(h=>{const k=h.acct+" ("+h.acctType+")";if(!a[k])a[k]={h:[],t:0,cls:h.acctClass};a[k].h.push(h);a[k].t+=h.mvCad;});return a;},[holdings]);

  const sectorExp = useMemo(()=>{const sec={};holdings.forEach(h=>{const sd=SECTOR_DATA[h.sym];if(!sd)return;Object.entries(sd).forEach(([k,p])=>{sec[k]=(sec[k]||0)+h.mvCad*(p/100);});});return Object.entries(sec).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({s:k,v,p:v/totalCad}));}, [holdings,totalCad]);

  const geoExp = useMemo(()=>{const g={};holdings.forEach(h=>{const gd=GEO_DATA[h.sym];if(!gd)return;Object.entries(gd).forEach(([k,p])=>{g[k]=(g[k]||0)+h.mvCad*(p/100);});});return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({g:k,v,p:v/totalCad}));}, [holdings,totalCad]);

  const topStocks = useMemo(()=>{const st={};const add=(list,sym)=>{const fh=holdings.find(h=>h.sym===sym);if(!fh)return;list.forEach(sk=>{const v=fh.mvCad*(sk.pct/100);if(!st[sk.ticker])st[sk.ticker]={name:sk.name,ticker:sk.ticker,v:0};st[sk.ticker].v+=v;});};Object.entries(TOP_STOCKS).forEach(([sym,list])=>add(list,sym));return Object.values(st).sort((a,b)=>b.v-a.v).map(sk=>({...sk,pp:sk.v/totalCad}));}, [holdings,totalCad]);

  const stressRes = useMemo(()=>{const sc=STRESS[scenario];if(!sc)return null;const imp=sc.impacts;return holdings.filter(h=>h.category!=="cash").map(h=>{let shock=imp[h.category]||0;const sd=SECTOR_DATA[h.sym];if(sd&&imp.sectors){let ss=0,tw=0;Object.entries(sd).forEach(([sec,w])=>{if(imp.sectors[sec]!=null){ss+=w*imp.sectors[sec];tw+=w;}});if(tw>0)shock=ss/100;else if(imp[h.category]!=null)shock=imp[h.category];}if(imp.currency){const gd=GEO_DATA[h.sym];if(gd){let cs=0;Object.entries(gd).forEach(([g,w])=>{cs+=(w/100)*(imp.currency[g]||0);});shock+=cs;}}if(imp.geo){const gd=GEO_DATA[h.sym];if(gd){let gs=0;Object.entries(gd).forEach(([g,w])=>{gs+=(w/100)*(imp.geo[g]||0);});shock+=gs;}}return {...h,shock,impact:h.mvCad*shock};});}, [holdings,scenario]);

  const totalImpact = useMemo(()=>stressRes?stressRes.reduce((a,h)=>a+h.impact,0):0,[stressRes]);

  const catSeg = useMemo(()=>Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:CL[c]||c,pct:v/totalCad,color:CC[c]||"#888"})),[byCat,totalCad]);
  const sorted = useMemo(()=>[...holdings].sort((a,b)=>{const av=sortCol==="sym"?a.sym:a[sortCol],bv=sortCol==="sym"?b.sym:b[sortCol];return typeof av==="string"?av.localeCompare(bv)*sortDir:(av-bv)*sortDir;}),[holdings,sortCol,sortDir]);
  const ts = c=>{if(sortCol===c)setSortDir(d=>d*-1);else{setSortCol(c);setSortDir(-1);}};
  const fPct = totalCad>0?holdings.filter(h=>h.type==="ETF").reduce((a,h)=>a+h.mvCad,0)/totalCad:0;
  // FIX #5: Calculate actual stock percentage instead of hardcoding 0
  const sPct = totalCad>0?(byCat.stock||0)/totalCad:0;
  const cPct = totalCad>0?(byCat.crypto||0)/totalCad:0;
  const cashPct = totalCad>0?(byCat.cash||0)/totalCad:0;
  const thD = threshold/100;
  const ac = ["#1D9E75","#378ADD","#7F77DD"];

  // FIX #5: Updated trades to use actual stock allocation instead of hardcoded 0
  const trades = useMemo(()=>{if(!holdings.length)return[];const list=[];const stgt=k=>subTargets[k]/100;const tgt=k=>targets[k]/100;
    const fundTotal = totalCad * tgt("funds");
    const catTarget={equity:stgt("equity")/100*fundTotal,bond:stgt("bond")/100*fundTotal,gold:stgt("gold")/100*fundTotal};
    const catActual={equity:holdings.filter(h=>h.category==="equity").reduce((a,h)=>a+h.mvCad,0),bond:holdings.filter(h=>h.category==="bond").reduce((a,h)=>a+h.mvCad,0),gold:holdings.filter(h=>h.category==="gold").reduce((a,h)=>a+h.mvCad,0)};
    ["equity","bond","gold"].forEach(cat=>{const diff=catTarget[cat]-catActual[cat];if(Math.abs(diff)>totalCad*thD){
      const ch=holdings.filter(h=>h.category===cat&&h.acctClass==="Self-Directed").sort((a,b)=>b.mvCad-a.mvCad);
      if(diff>0&&ch.length>0)list.push({action:"BUY",sym:ch[0].sym,name:ch[0].name,amount:Math.round(diff),reason:`${CL[cat]} underweight by ${fmt(Math.abs(diff))}`,category:cat});
      else if(diff<0&&ch.length>0)list.push({action:"SELL",sym:ch[0].sym,name:ch[0].name,amount:Math.round(Math.min(Math.abs(diff),ch[0].mvCad)),reason:`${CL[cat]} overweight by ${fmt(Math.abs(diff))}`,category:cat});
    }});
    // FIX #5: Use actual stock value instead of assuming 0
    const actualStockVal = byCat.stock || 0;
    const stockTarget = tgt("stocks") * totalCad;
    const stockDiff = stockTarget - actualStockVal;
    if(Math.abs(stockDiff) > totalCad * thD) {
      list.push({action:stockDiff>0?"BUY":"SELL",sym:"â",name:"Individual stock picks",amount:Math.round(Math.abs(stockDiff)),reason:`Stocks target: ${targets.stocks}%, actual: ${(sPct*100).toFixed(1)}%`,category:"stock"});
    }
    const cryptoDiff=(tgt("crypto")*totalCad)-(byCat.crypto||0);
    if(Math.abs(cryptoDiff)>totalCad*thD)list.push({action:cryptoDiff>0?"BUY":"SELL",sym:"BTC/ETH",name:"Crypto",amount:Math.round(Math.abs(cryptoDiff)),reason:`Crypto target: ${targets.crypto}%, actual: ${(cPct*100).toFixed(1)}%`,category:"crypto"});
    return list;
  },[holdings,totalCad,targets,subTargets,byCat,thD,cPct,sPct]);

  const feeOverBudget = totalFees > feeBudget;
  const feeTrades = useMemo(()=>{if(!feeOverBudget)return[];const excess=totalFees-feeBudget;const exp=[...holdings].filter(h=>h.mer!=null&&h.mer>0.25&&h.acctClass==="Self-Directed").sort((a,b)=>b.annualFee-a.annualFee);const list=[];let saved=0;for(const h of exp){if(saved>=excess)break;list.push({sym:h.sym,name:h.name,mer:h.mer,fee:h.annualFee,suggestion:`Replace ${h.sym} (${h.mer}% MER) with lower-cost alternative`});saved+=h.annualFee;}return list;},[holdings,totalFees,feeBudget,feeOverBudget]);

  const sectorDiffs = useMemo(()=>sectorExp.map(se=>{const target=sectorTargets[se.s]||0;return {...se,target,diff:se.p*100-target};}).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)),[sectorExp,sectorTargets]);

  const pnlAttrib = useMemo(() => {
    if (!holdings.length) return [];
    return holdings.filter(h => h.category !== "cash" && Math.abs(h.unrealCad) > 1)
      .sort((a, b) => b.unrealCad - a.unrealCad).slice(0, 15);
  }, [holdings]);
  const maxPnl = useMemo(() => pnlAttrib.length > 0 ? Math.max(...pnlAttrib.map(h => Math.abs(h.unrealCad)), 1) : 1, [pnlAttrib]);

  // FIX #4: Compute DCA data for stock holdings
  const stockHoldings = holdings.filter(h => h.category === "stock");
  const stockDCAData = useMemo(() => {
    const data = {};
    stockHoldings.forEach(h => {
      const trades = activitiesTrades[h.sym];
      if (trades) data[h.sym] = computeDCA(trades);
    });
    return data;
  }, [stockHoldings, activitiesTrades]);

  // Combined exposure: stocks held + ETF look-through overlap
  const combinedExposure = useMemo(() => {
    return stockHoldings.map(h => {
      const etfExposure = topStocks.find(ts => ts.ticker === h.sym);
      return { ...h, etfOverlap: etfExposure ? etfExposure.v : 0, totalExposure: h.mvCad + (etfExposure ? etfExposure.v : 0) };
    });
  }, [stockHoldings, topStocks]);

  // ===== TPA: role tags, risk contribution, policy checks, whole balance sheet =====
  const creditDrawn = useMemo(() => -(rawHoldings||[]).filter(h=>h.category==="debt").reduce((a,h)=>a+h.mv,0), [rawHoldings]);

  // Risk units: one per symbol; the managed account is looked through to its ETFs but shown as one row
  const tpaUnits = useMemo(() => {
    const m = {};
    holdings.forEach(h => {
      const isCash = h.category === "cash";
      const managed = h.acctClass === "Managed" && !isCash;
      const key = isCash ? "CASH" : managed ? "INCOME:"+h.sym : h.sym;
      if (!m[key]) m[key] = {key, row: isCash ? "CASH" : managed ? "INCOME" : h.sym, name: h.name, category: h.category, mv: 0};
      m[key].mv += h.mvCad;
    });
    return Object.values(m);
  }, [holdings]);

  const tpaRisk = useMemo(() => {
    const tot = tpaUnits.reduce((a,u)=>a+u.mv,0);
    if (tot <= 0) return {vol:0, rc:{}};
    const w = tpaUnits.map(u=>u.mv/tot), v = tpaUnits.map(u=>RISK_VOL[u.category] ?? 0.15);
    const rho = (i,j) => {
      if (i===j) return 1;
      const a = tpaUnits[i].category, b = tpaUnits[j].category;
      if (a===b) return RISK_SAME[a] ?? 0.8;
      return RISK_CORR[[a,b].sort().join("|")] ?? 0.3;
    };
    const mc = w.map((_,i)=>w.reduce((acc,wj,j)=>acc+wj*v[i]*v[j]*rho(i,j),0));
    const variance = w.reduce((a,wi,i)=>a+wi*mc[i],0);
    const rc = {};
    tpaUnits.forEach((u,i)=>{rc[u.row]=(rc[u.row]||0)+(variance>0?w[i]*mc[i]/variance:0);});
    return {vol: Math.sqrt(variance), rc};
  }, [tpaUnits]);

  const tpaRows = useMemo(() => {
    const m = {}, tot = tpaUnits.reduce((a,u)=>a+u.mv,0);
    tpaUnits.forEach(u => {
      if (!m[u.row]) m[u.row] = {row:u.row, name: u.row==="INCOME" ? "Income portfolio (managed)" : u.row==="CASH" ? "Cash" : u.name, category: u.row==="INCOME" ? "mixed" : u.category, mv:0};
      m[u.row].mv += u.mv;
    });
    return Object.values(m).map(r => {
      const role = roles[r.row] || DEFAULT_ROLES[r.row] || (r.category==="stock" ? "Single stock" : "Untagged");
      const rep = replaces[r.row] || (role==="Core (reference)"||role==="Liquidity" ? "—" : "Global equity");
      return {...r, w: tot>0 ? r.mv/tot : 0, rc: tpaRisk.rc[r.row]||0, role, replaces: rep, sat: !NON_SATELLITE.includes(role)};
    }).sort((a,b)=>b.rc-a.rc);
  }, [tpaUnits, tpaRisk, roles, replaces]);

  const n = k => +tpa[k] || 0;
  const liquidCash = byCat.cash || 0;
  const cashAll = liquidCash + n("otherCash");
  const bucketA = totalCad - liquidCash;
  const satVal = tpaRows.filter(r=>r.sat).reduce((a,r)=>a+r.mv,0);
  const satRisk = tpaRows.filter(r=>r.sat).reduce((a,r)=>a+r.rc,0);
  const defVal = tpaRows.filter(r=>r.role==="Defensive / income").reduce((a,r)=>a+r.mv,0);
  const satPct = bucketA>0 ? satVal/bucketA : 0;
  const satPctIncl = bucketA>0 ? (satVal+defVal)/bucketA : 0;
  const cryptoVal = byCat.crypto || 0;
  const cashMonths = n("monthlySpend")>0 ? cashAll/n("monthlySpend") : null;
  const creditUse = n("creditLimit")>0 ? creditDrawn/n("creditLimit") : null;
  const overPos = tpaRows.filter(r=>r.sat && r.w*100 > guardrails.maxPositionPct);
  const untagged = tpaRows.filter(r=>r.role==="Untagged");

  const ukPen = n("ukPensionGbp")*n("gbpCad");
  const eqLike = (byCat.equity||0)+(byCat.stock||0);
  const wol = [
    {l:"Liquid: equity-like",v:eqLike,c:CC.equity,eq:true},
    {l:"UK pension (assumed 100% equity)",v:ukPen,c:"#0F6E56",eq:true},
    {l:"Workplace DC plan (assumed equity)",v:n("workplaceDc"),c:"#639922",eq:true},
    {l:"Liquid: bonds",v:byCat.bond||0,c:CC.bond},
    {l:"DB plan (commuted value, bond-like)",v:n("dbCommuted"),c:"#534AB7"},
    {l:"Crypto",v:cryptoVal,c:CC.crypto},
    {l:"Gold",v:byCat.gold||0,c:CC.gold},
    {l:"Cash",v:cashAll,c:CC.cash},
  ].filter(x=>x.v>0);
  const wolTotal = wol.reduce((a,x)=>a+x.v,0);
  const wolEq = wolTotal>0 ? wol.filter(x=>x.eq).reduce((a,x)=>a+x.v,0)/wolTotal : 0;
  const bucketC = ukPen + n("workplaceDc") + n("dbCommuted");
  const setT = k => val => setTpa(t=>({...t,[k]:val}));

  // ========== RENDER ==========

  if (!rawHoldings) {
    return (
      <div style={{minHeight:"100vh",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center"}}
        onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}>
        <div style={{...s.card,maxWidth:440,textAlign:"center",padding:"2.5rem",border:dragOver?"2px dashed var(--green)":"0.5px solid var(--border)"}}>
          <div style={{fontSize:22,fontWeight:500,marginBottom:8}}>Portfolio Dashboard</div>
          <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:20}}>Drop your Wealthsimple CSV export here, or click to upload</div>
          <input type="file" accept=".csv" onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])} style={{fontSize:13}}/>
        </div>
      </div>
    );
  }

  const TABS = ["overview","holdings","exposure","stocks","stress","rebalance","tpa","balance"];
  const TAB_LABELS = {tpa:"TPA",balance:"Balance sheet"};

  return (
    <div style={{minHeight:"100vh",background:"var(--bg-secondary)",padding:"1rem"}}
      onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:17,fontWeight:500}}>Portfolio Dashboard</span>
          {csvDate && <span style={{fontSize:11,color:"var(--text-secondary)"}}>CSV: {csvDate}</span>}
          {lastPriceFetch && <span style={{fontSize:11,color:"var(--green)"}}>Live: {lastPriceFetch}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={fetchPrices} disabled={priceLoading}
            style={{padding:"4px 12px",fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text-primary)",opacity:priceLoading?0.5:1,cursor:"pointer"}}>
            {priceLoading?"Fetching...":"Refresh prices"}
          </button>
          <label style={{padding:"4px 12px",fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text-primary)",cursor:"pointer"}}>
            Upload CSV
            <input type="file" accept=".csv" onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])} style={{display:"none"}}/>
          </label>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"5px 14px",fontSize:12,fontWeight:tab===t?500:400,
              background:tab===t?"var(--bg-primary)":"transparent",
              border:tab===t?"0.5px solid var(--border)":"0.5px solid transparent",
              borderRadius:"var(--radius)",color:tab===t?"var(--text-primary)":"var(--text-secondary)",cursor:"pointer"}}>
            {TAB_LABELS[t]||t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {dragOver && <div style={{padding:12,textAlign:"center",border:"2px dashed var(--green)",borderRadius:"var(--radius-lg)",marginBottom:12,fontSize:13,color:"var(--green)"}}>Drop CSV to update</div>}

      {/* ====== OVERVIEW TAB ====== */}
      {tab==="overview"&&<div>
        <div style={s.g("repeat(auto-fit, minmax(150px, 1fr))")}>
          <M label="Total value" value={fmt(totalCad)} sub={`Book: ${fmt(totalBook)}`}/>
          <M label="Unrealized P&L" value={fmt(totalUnreal)} color={totalUnreal>=0?"var(--green)":"var(--red)"} sub={totalBook>0?`${(totalUnreal/totalBook*100).toFixed(1)}% return`:""}/>
          <M label="Weighted MER" value={wMER.toFixed(2)+"%"} sub={`${fmt(totalFees)}/yr in fees`}/>
          <M label="Positions" value={holdings.filter(h=>h.category!=="cash").length} sub={`${Object.keys(byAcct).length} accounts`}/>
          {sPct > 0 && <M label="Stock allocation" value={pct(sPct)} sub={`Target: ${targets.stocks}%`} color={Math.abs(sPct*100-targets.stocks)>threshold?"var(--red)":"var(--green)"}/>}
        </div>

        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          {/* Asset class breakdown */}
          <div style={s.card}>
            <div style={s.sec}>Asset class breakdown</div>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <Donut segments={catSeg}/>
              <div style={{flex:1}}>
                {catSeg.map(sg=><div key={sg.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <div style={{width:9,height:9,borderRadius:2,background:sg.color,flexShrink:0}}/>
                  <span style={{fontSize:12,flex:1}}>{sg.label}</span>
                  <span style={{fontSize:12,fontWeight:500}}>{pct(sg.pct)}</span>
                </div>)}
              </div>
            </div>
          </div>

          {/* FIX #3: Account breakdown with Managed badge */}
          <div style={s.card}>
            <div style={s.sec}>Account breakdown</div>
            <Bar h={18} segments={Object.entries(byAcct).map(([n,d],i)=>({label:n,pct:d.t/totalCad,color:ac[i%3]}))}/>
            <div style={{marginTop:10}}>
              {Object.entries(byAcct).map(([n,d],i)=><div key={n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{width:9,height:9,borderRadius:2,background:ac[i%3],flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{n}</span>
                {/* FIX #3: Managed account badge */}
                {d.cls === "Managed" ? (
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:"var(--radius)",background:"#7F77DD1a",color:"#7F77DD",fontWeight:500}}>Managed</span>
                ) : (
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:"var(--radius)",background:"#1D9E751a",color:"#1D9E75",fontWeight:500}}>Self-Directed</span>
                )}
                <span style={{fontSize:12,fontWeight:500}}>{fmt(d.t)}</span>
              </div>)}
            </div>
          </div>
        </div>

        {/* Geographic & Sector overview bars */}
        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          <div style={s.card}>
            <div style={s.sec}>Geographic exposure</div>
            <Bar h={18} segments={geoExp.map(g=>({label:g.g,pct:g.p,color:GCC[g.g]||"#888"}))}/>
            <div style={{marginTop:8}}>
              {geoExp.map(g=><div key={g.g} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:9,height:9,borderRadius:2,background:GCC[g.g]||"#888",flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{g.g}</span>
                <span style={{fontSize:12,fontWeight:500}}>{pct(g.p)}</span>
              </div>)}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sec}>Sector exposure</div>
            <Bar h={18} segments={sectorExp.slice(0,8).map(se=>({label:se.s,pct:se.p,color:SC[se.s]||"#888"}))}/>
            <div style={{marginTop:8}}>
              {sectorExp.slice(0,8).map(se=><div key={se.s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <div style={{width:9,height:9,borderRadius:2,background:SC[se.s]||"#888",flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{se.s}</span>
                <span style={{fontSize:12,fontWeight:500}}>{pct(se.p)}</span>
              </div>)}
            </div>
          </div>
        </div>
      

        {/* P&L Attribution */}
        {pnlAttrib.length > 0 && <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>P&L contribution by holding</div>
          <div style={{display:"flex",gap:4,marginBottom:8}}>
            <span style={{fontSize:11,display:"flex",alignItems:"center",gap:4}}><span style={{width:9,height:9,borderRadius:2,background:"#1D9E75"}}></span> Gain</span>
            <span style={{fontSize:11,display:"flex",alignItems:"center",gap:4,marginLeft:8}}><span style={{width:9,height:9,borderRadius:2,background:"#E24B4A"}}></span> Loss</span>
          </div>
          {pnlAttrib.map(h=>{
            const pctW=Math.abs(h.unrealCad)/maxPnl*100;
            return <div key={h.sym+h.acctNum} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:500,minWidth:55,textAlign:"right"}}>{h.sym}</span>
              <div style={{flex:1,height:14}}>
                <div style={{width:pctW+"%",height:14,background:h.unrealCad>=0?"#1D9E75":"#E24B4A",borderRadius:2,minWidth:2}}></div>
              </div>
              <span style={{fontSize:11,fontWeight:500,minWidth:65,textAlign:"right",color:h.unrealCad>=0?"#1D9E75":"#E24B4A"}}>{h.unrealCad>=0?"+":""}{fmt(h.unrealCad)}</span>
            </div>;
          })}
        </div>}
      </div>}

      {/* ====== HOLDINGS TAB ====== */}
      {tab==="holdings"&&<div style={{overflowX:"auto"}}>
        <div style={s.card}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {[["sym","Symbol"],["name","Name"],["acct","Account"],["category","Type"],["mer","MER"],["mvCad","Value"],["unrealCad","P&L"],["change","Day %"],["annualFee","Fee/yr"]].map(([k,l])=>
                <th key={k} style={s.th} onClick={()=>ts(k)}>{l}{sortCol===k?(sortDir>0?" â²":" â¼"):""}</th>)}
            </tr></thead>
            <tbody>
              {sorted.map((h,i)=><tr key={h.sym+h.acctNum+i}>
                <td style={{...s.td,fontWeight:500}}>{h.sym}</td>
                <td style={{...s.td,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
                <td style={s.td}>
                  <span style={{fontSize:11}}>{h.acctType}</span>
                  {/* FIX #3: Show managed badge in holdings table too */}
                  {h.acctClass === "Managed" && <span style={{marginLeft:4,fontSize:9,padding:"1px 5px",borderRadius:"var(--radius)",background:"#7F77DD1a",color:"#7F77DD",fontWeight:500}}>M</span>}
                </td>
                <td style={s.td}><span style={s.badge(CC[h.category]||"#888")}>{h.category}</span></td>
                <td style={s.td}>{h.mer!=null?h.mer.toFixed(2)+"%":"â"}</td>
                <td style={{...s.td,fontWeight:500}}>{fmt(h.mvCad)}</td>
                <td style={{...s.td,color:h.unrealCad>=0?"var(--green)":"var(--red)"}}>{fmt(h.unrealCad)}</td>
                <td style={{...s.td,color:h.change>0?"var(--green)":h.change<0?"var(--red)":"var(--text-secondary)"}}>{h.change!=null?h.change.toFixed(2)+"%":"â"}</td>
                <td style={s.td}>{h.annualFee>0?fmtD(h.annualFee):"â"}</td>
              </tr>)}
            </tbody>
            <tfoot><tr>
              <td colSpan={5} style={{...s.td,fontWeight:500,fontSize:12}}>Total</td>
              <td style={{...s.td,fontWeight:500}}>{fmt(totalCad)}</td>
              <td style={{...s.td,fontWeight:500,color:totalUnreal>=0?"var(--green)":"var(--red)"}}>{fmt(totalUnreal)}</td>
              <td style={s.td}></td>
              <td style={{...s.td,fontWeight:500}}>{fmtD(totalFees)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>}

      {/* ====== EXPOSURE TAB ====== */}
      {tab==="exposure"&&<div>
        <div style={{...s.g("1fr 1fr"),marginBottom:12}}>
          <div style={s.card}>
            <div style={s.sec}>Sector detail</div>
            {sectorExp.map(se=><div key={se.s} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                <span>{se.s}</span>
                <span style={{fontWeight:500}}>{pct(se.p)} ({fmt(se.v)})</span>
              </div>
              <div style={{height:6,background:"var(--bg-secondary)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct(se.p/(sectorExp[0]?.p||1)),background:SC[se.s]||"#888",borderRadius:3}}/>
              </div>
            </div>)}
          </div>
          <div style={s.card}>
            <div style={s.sec}>Geographic detail</div>
            {geoExp.map(g=><div key={g.g} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                <span>{g.g}</span>
                <span style={{fontWeight:500}}>{pct(g.p)} ({fmt(g.v)})</span>
              </div>
              <div style={{height:6,background:"var(--bg-secondary)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct(g.p/(geoExp[0]?.p||1)),background:GCC[g.g]||"#888",borderRadius:3}}/>
              </div>
            </div>)}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.sec}>Top stock exposures (ETF look-through)</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {["Ticker","Name","Exposure","% of portfolio"].map(h=><th key={h} style={s.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {topStocks.slice(0,20).map(sk=><tr key={sk.ticker}>
                <td style={{...s.td,fontWeight:500}}>{sk.ticker}</td>
                <td style={s.td}>{sk.name}</td>
                <td style={{...s.td,fontWeight:500}}>{fmt(sk.v)}</td>
                <td style={s.td}>{pct(sk.pp)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>}

      {/* ====== STOCKS TAB ====== */}
      {tab==="stocks"&&<div>
        {/* FIX #4: Updated guardrails - removed minConviction */}
        <div style={s.card}>
          <div style={s.sec}>Guardrail settings</div>
          {[{k:"maxPositionPct",l:"Max single position (% of total)",min:1,max:15,step:1,unit:"%"},
            {k:"maxThemePct",l:"Max single theme (% of stock sleeve)",min:10,max:50,step:5,unit:"%"},
            {k:"drawdownAlert",l:"Drawdown review trigger (%)",min:5,max:40,step:5,unit:"%"},
          ].map(({k,l,min,max,step,unit})=>(
            <div key={k} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:11,color:"var(--text-secondary)"}}>{l}</span>
                <span style={{fontSize:12,fontWeight:500}}>{guardrails[k]}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={guardrails[k]} onChange={e=>setGuardrails(g=>({...g,[k]:+e.target.value}))} style={{width:"100%"}}/>
            </div>
          ))}
        </div>

        {/* Stock position monitoring */}
        {stockHoldings.length > 0 && <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Position monitoring</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {["Symbol","Name","Theme","Value","P&L","% of portfolio","First bought","Avg cost","Top-ups",""].map(h=>
                <th key={h} style={s.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {combinedExposure.sort((a,b)=>b.mvCad-a.mvCad).map(h=>{
                const posViol = (h.mvCad/totalCad)*100 > guardrails.maxPositionPct;
                const dca = stockDCAData[h.sym];
                return <tr key={h.sym+h.acctNum}>
                  <td style={{...s.td,fontWeight:500}}>{h.sym}</td>
                  <td style={{...s.td,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
                  <td style={s.td}>
                    <select value={stockThemes[h.sym]||""} onChange={e=>setStockThemes(t=>({...t,[h.sym]:e.target.value}))}
                      style={{fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",padding:"2px 4px",color:"var(--text-primary)"}}>
                      <option value="">â</option>
                      {THEME_LIST.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{...s.td,fontWeight:500}}>{fmt(h.mvCad)}</td>
                  <td style={{...s.td,color:h.unrealCad>=0?"var(--green)":"var(--red)"}}>{fmt(h.unrealCad)}</td>
                  <td style={{...s.td,fontWeight:500,color:posViol?"var(--red)":"var(--text-primary)"}}>
                    {pct(h.mvCad/totalCad)}
                    {posViol && <span style={{marginLeft:4,fontSize:9,color:"var(--red)"}}>OVER</span>}
                  </td>
                  {/* FIX #4: DCA data from activities CSV */}
                  <td style={s.td}>{dca ? dca.firstBuy : <span style={{color:"var(--text-secondary)",fontSize:11}}>â</span>}</td>
                  <td style={s.td}>{dca ? fmtD(dca.avgPrice) : <span style={{color:"var(--text-secondary)",fontSize:11}}>â</span>}</td>
                  <td style={s.td}>{dca ? dca.buyCount : <span style={{color:"var(--text-secondary)",fontSize:11}}>â</span>}</td>
                  <td style={s.td}>
                    <button onClick={()=>{const n=prompt("Notes for "+h.sym, stockNotes[h.sym]||"");if(n!=null)setStockNotes(sn=>({...sn,[h.sym]:n}));}}
                      style={{fontSize:10,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",padding:"2px 6px",cursor:"pointer",color:"var(--text-primary)"}}>
                      {stockNotes[h.sym]?"Edit note":"+ Note"}
                    </button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>

          {/* DCA upload hint */}
          {Object.keys(activitiesTrades).length === 0 && (
            <div style={{marginTop:10,padding:10,background:"var(--bg-secondary)",borderRadius:"var(--radius)",fontSize:11,color:"var(--text-secondary)"}}>
              To see purchase dates and DCA data, upload your Wealthsimple Activities CSV using the &quot;Upload CSV&quot; button above. The dashboard will automatically detect it as a trade history file.
            </div>
          )}
        </div>}

        {stockHoldings.length === 0 && <div style={{...s.card,marginTop:12}}>
          <div style={{fontSize:13,color:"var(--text-secondary)",textAlign:"center",padding:"2rem"}}>
            No individual stock positions found. Stocks will appear here when your CSV includes STOCK or EQUITY security types.
          </div>
        </div>}

        {/* Theme concentration check */}
        {stockHoldings.length > 0 && <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Theme concentration</div>
          {(() => {
            const stockSleeveVal = byCat.stock || 0;
            const byTheme = {};
            stockHoldings.forEach(h => {
              const t = stockThemes[h.sym] || "Unassigned";
              byTheme[t] = (byTheme[t] || 0) + h.mvCad;
            });
            return Object.entries(byTheme).sort((a,b)=>b[1]-a[1]).map(([t,v]) => {
              const themePct = stockSleeveVal > 0 ? (v/stockSleeveVal)*100 : 0;
              const over = themePct > guardrails.maxThemePct;
              return <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:9,height:9,borderRadius:2,background:THEME_COLORS[t]||"#888",flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{t}</span>
                <span style={{fontSize:12,fontWeight:500,color:over?"var(--red)":"var(--text-primary)"}}>{themePct.toFixed(1)}%</span>
                {over && <span style={{fontSize:9,color:"var(--red)",fontWeight:500}}>OVER {guardrails.maxThemePct}% LIMIT</span>}
                <span style={{fontSize:11,color:"var(--text-secondary)"}}>{fmt(v)}</span>
              </div>;
            });
          })()}
        </div>}

        {/* Notes display */}
        {Object.entries(stockNotes).filter(([,v])=>v).length > 0 && <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Research notes</div>
          {Object.entries(stockNotes).filter(([,v])=>v).map(([sym,note])=>(
            <div key={sym} style={{marginBottom:8,padding:8,background:"var(--bg-secondary)",borderRadius:"var(--radius)"}}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:2}}>{sym}</div>
              <div style={{fontSize:11,color:"var(--text-secondary)",whiteSpace:"pre-wrap"}}>{note}</div>
            </div>
          ))}
        </div>}
      </div>}

      {/* ====== STRESS TEST TAB ====== */}
      {tab==="stress"&&stressRes&&<div>
        <div style={s.card}>
          <div style={s.sec}>Scenario</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {Object.entries(STRESS).map(([k,v])=>(
              <button key={k} onClick={()=>setScenario(k)}
                style={{padding:"5px 12px",fontSize:11,fontWeight:scenario===k?500:400,
                  background:scenario===k?"var(--bg-primary)":"var(--bg-secondary)",
                  border:scenario===k?"0.5px solid var(--border)":"0.5px solid transparent",
                  borderRadius:"var(--radius)",color:"var(--text-primary)",cursor:"pointer"}}>
                {v.name}
              </button>
            ))}
          </div>
          <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:12}}>{STRESS[scenario].desc}</div>
          <div style={s.g("1fr 1fr")}>
            <M label="Portfolio impact" value={fmt(totalImpact)} color={totalImpact>=0?"var(--green)":"var(--red)"} sub={pct(totalImpact/totalCad)+" of portfolio"}/>
            <M label="Projected value" value={fmt(totalCad+totalImpact)} sub={`From ${fmt(totalCad)}`}/>
          </div>
        </div>
        <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Impact by holding</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {["Symbol","Category","Current value","Shock","Impact","Projected"].map(h=><th key={h} style={s.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {stressRes.sort((a,b)=>a.impact-b.impact).map((h,i)=><tr key={h.sym+i}>
                <td style={{...s.td,fontWeight:500}}>{h.sym}</td>
                <td style={s.td}><span style={s.badge(CC[h.category]||"#888")}>{h.category}</span></td>
                <td style={s.td}>{fmt(h.mvCad)}</td>
                <td style={{...s.td,color:h.shock>=0?"var(--green)":"var(--red)"}}>{(h.shock*100).toFixed(1)}%</td>
                <td style={{...s.td,fontWeight:500,color:h.impact>=0?"var(--green)":"var(--red)"}}>{fmt(h.impact)}</td>
                <td style={s.td}>{fmt(h.mvCad+h.impact)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>}

      {/* ====== REBALANCE TAB ====== */}
      {tab==="rebalance"&&<div>
        <div style={s.g("1fr 1fr")}>
          <div style={s.card}>
            <div style={s.sec}>Allocation targets</div>
            {/* FIX #5: Use actual sPct instead of hardcoded 0 */}
            {[{k:"funds",l:"Funds",c:CC.equity,cur:fPct},
              {k:"stocks",l:"Stocks",c:CC.stock,cur:sPct},
              {k:"crypto",l:"Crypto",c:CC.crypto,cur:cPct}]
              .map(({k,l,c,cur})=>{
                const drift=cur-targets[k]/100,over=Math.abs(drift)>thD;
                return <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:500}}>{l}</span>
                    <div style={{display:"flex",gap:8,fontSize:11}}>
                      <span style={{color:"var(--text-secondary)"}}>Actual: {pct(cur)}</span>
                      <span style={{fontWeight:500,color:over?"var(--red)":"var(--green)"}}>
                        {drift>=0?"+":""}{(drift*100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="range" min={0} max={100} step={5} value={targets[k]} onChange={e=>setTargets(p=>({...p,[k]:+e.target.value}))} style={{flex:1}}/>
                    <span style={{fontSize:13,fontWeight:500,minWidth:34,textAlign:"right",color:c}}>{targets[k]}%</span>
                  </div>
                </div>;
              })}
            {targets.funds+targets.stocks+targets.crypto!==100 && (
              <div style={{fontSize:11,color:"var(--red)",marginTop:4}}>Targets sum to {targets.funds+targets.stocks+targets.crypto}% (should be 100%)</div>
            )}
            {cashPct > 0.001 && (
              <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:6}}>Cash held: {pct(cashPct)} ({fmt(byCat.cash||0)}) â not included in allocation targets</div>
            )}
          </div>
          <div style={s.card}>
            <div style={s.sec}>Sub-asset targets (within Funds)</div>
            {[{k:"equity",l:"Equity",c:CC.equity},{k:"bond",l:"Bond",c:CC.bond},{k:"gold",l:"Gold",c:CC.gold}]
              .map(({k,l,c})=>(
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:500}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:500,color:c}}>{subTargets[k]}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={subTargets[k]} onChange={e=>setSubTargets(p=>({...p,[k]:+e.target.value}))} style={{width:"100%"}}/>
                </div>
              ))}
            {subTargets.equity+subTargets.bond+subTargets.gold!==100 && (
              <div style={{fontSize:11,color:"var(--red)",marginTop:4}}>Sub-targets sum to {subTargets.equity+subTargets.bond+subTargets.gold}% (should be 100%)</div>
            )}
          </div>
        </div>

        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          <div style={s.card}>
            <div style={s.sec}>Fee budget</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>Annual fee budget</span>
              <span style={{fontSize:12,fontWeight:500,color:feeOverBudget?"var(--red)":"var(--green)"}}>{fmt(feeBudget)}</span>
            </div>
            <input type="range" min={50} max={500} step={25} value={feeBudget} onChange={e=>setFeeBudget(+e.target.value)} style={{width:"100%"}}/>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:4}}>Current fees: {fmtD(totalFees)}/yr {feeOverBudget&&<span style={{color:"var(--red)"}}>(over budget by {fmtD(totalFees-feeBudget)})</span>}</div>
            {feeTrades.length > 0 && <div style={{marginTop:8}}>
              <div style={{fontSize:11,fontWeight:500,marginBottom:4}}>Fee reduction suggestions:</div>
              {feeTrades.map((ft,i) => <div key={i} style={{fontSize:11,color:"var(--text-secondary)",marginBottom:3}}>{ft.suggestion}</div>)}
            </div>}
          </div>
          <div style={s.card}>
            <div style={s.sec}>Rebalance threshold</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontSize:11,color:"var(--text-secondary)"}}>Drift threshold before suggesting trades</span>
              <span style={{fontSize:12,fontWeight:500}}>{threshold}%</span>
            </div>
            <input type="range" min={1} max={15} step={1} value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{width:"100%"}}/>
          </div>
        </div>

        {/* Suggested trades */}
        <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Suggested trades</div>
          {trades.length===0&&<div style={{fontSize:12,color:"var(--text-secondary)"}}>Portfolio within targets. No rebalancing needed.</div>}
          {trades.map((t,i)=><div key={i} style={{padding:"7px 0",borderBottom:"0.5px solid var(--border)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
              <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:"var(--radius)",
                background:t.action==="BUY"?"#1D9E751a":"#E24B4A1a",
                color:t.action==="BUY"?"#1D9E75":"#E24B4A"}}>
                {t.action}
              </span>
              <span style={{fontSize:12,fontWeight:500}}>{t.sym}</span>
              <span style={{fontSize:11,color:"var(--text-secondary)",flex:1}}>{t.name}</span>
              <span style={{fontSize:13,fontWeight:500}}>{fmt(t.amount)}</span>
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)"}}>{t.reason}</div>
          </div>)}
        </div>

        {/* Sector targets */}
        <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Sector targets</div>
          {sectorDiffs.map(se=>(
            <div key={se.s} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:12}}>{se.s}</span>
                <div style={{display:"flex",gap:8,fontSize:11}}>
                  <span style={{color:"var(--text-secondary)"}}>Actual: {(se.p*100).toFixed(1)}%</span>
                  <span style={{fontWeight:500,color:Math.abs(se.diff)>3?"var(--red)":"var(--green)"}}>{se.diff>=0?"+":""}{se.diff.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="range" min={0} max={30} step={1} value={sectorTargets[se.s]||0} onChange={e=>setSectorTargets(t=>({...t,[se.s]:+e.target.value}))} style={{flex:1}}/>
                <span style={{fontSize:11,fontWeight:500,minWidth:28,textAlign:"right"}}>{sectorTargets[se.s]||0}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* ====== TPA TAB ====== */}
      {tab==="tpa"&&<div>
        <div style={s.g("repeat(auto-fit, minmax(150px, 1fr))")}>
          <M label="Portfolio volatility (illustrative)" value={pct(tpaRisk.vol)} sub="From placeholder assumptions"/>
          <M label="Satellites, % of Bucket A" value={pct(satPct)} sub={`Limit ${tpa.satMaxPct}% · ${pct(satPctIncl)} incl. defensive`} color={satPct*100>tpa.satMaxPct?"var(--red)":"var(--green)"}/>
          <M label="Satellites, share of risk" value={pct(satRisk)} sub={`From ${pct(totalCad>0?satVal/totalCad:0)} of value`}/>
          <M label="Core (reference)" value={pct(totalCad>0?tpaRows.filter(r=>r.role==="Core (reference)").reduce((a,r)=>a+r.mv,0)/totalCad:0)} sub="Share of liquid portfolio"/>
        </div>

        <div style={{...s.card,marginTop:12}}>
          <div style={s.sec}>Policy checks</div>
          <Check ok={satPct*100<=tpa.satMaxPct} label={`Satellites at most ${tpa.satMaxPct}% of Bucket A (excludes core, cash and the defensive sleeve)`} detail={`${pct(satPct)} · ${fmt(satVal)}`}/>
          <Check ok={overPos.length===0} label={`No satellite position above ${guardrails.maxPositionPct}% of the portfolio`} detail={overPos.length?overPos.map(r=>`${r.row} ${pct(r.w)}`).join(", "):"None"}/>
          <Check ok={totalCad>0?cryptoVal/totalCad*100<=tpa.cryptoMaxPct:true} label={`Crypto weight at most ${tpa.cryptoMaxPct}%`} detail={pct(totalCad>0?cryptoVal/totalCad:0)}/>
          <Check ok={n("cryptoCapCad")>0?cryptoVal<=n("cryptoCapCad"):null} label="Crypto under its dollar cap" detail={n("cryptoCapCad")>0?`${fmt(cryptoVal)} of ${fmt(n("cryptoCapCad"))}`:fmt(cryptoVal)}/>
          <Check ok={cashMonths==null?null:cashMonths>=tpa.cashMonthsMin} label={`Cash buffer of ${tpa.cashMonthsMin}–${tpa.cashMonthsMax} months of spending (Bucket 0)`} detail={cashMonths==null?fmt(cashAll):`${cashMonths.toFixed(1)} months · ${fmt(cashAll)}`}/>
          <Check ok={creditUse==null?(creditDrawn>0?null:true):creditUse<=0.25} label="Credit line drawn at most 25% of its limit" detail={creditUse==null?fmt(creditDrawn):`${pct(creditUse)} · ${fmt(creditDrawn)} of ${fmt(n("creditLimit"))}`}/>
          <Check ok={untagged.length===0} label="Every position has a role" detail={untagged.length?untagged.map(r=>r.row).join(", "):"All tagged"}/>
        </div>

        <div style={{...s.card,marginTop:12,overflowX:"auto"}}>
          <div style={s.sec}>Roles and risk contribution (ranked by share of risk)</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {["Position","Role","Replaces","Value","Weight","Share of risk","Risk ÷ weight",""].map(h=><th key={h} style={{...s.th,cursor:"default"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {tpaRows.map(r=>{
                const ratio = r.w>0 ? r.rc/r.w : 0;
                const sel = {fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",padding:"2px 4px",color:"var(--text-primary)"};
                return <tr key={r.row}>
                  <td style={{...s.td,fontWeight:500}}>{r.row==="INCOME"?"Income":r.row}<div style={{fontSize:10,fontWeight:400,color:"var(--text-secondary)",maxWidth:170,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div></td>
                  <td style={s.td}><select value={r.role} onChange={e=>setRoles(x=>({...x,[r.row]:e.target.value}))} style={sel}>{ROLES.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={s.td}><select value={r.replaces} onChange={e=>setReplaces(x=>({...x,[r.row]:e.target.value}))} style={sel}>{REPLACES.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...s.td,fontWeight:500}}>{fmt(r.mv)}</td>
                  <td style={s.td}>{pct(r.w)}</td>
                  <td style={{...s.td,fontWeight:500}}>{pct(r.rc)}</td>
                  <td style={{...s.td,color:ratio>1.5?"var(--red)":"var(--text-primary)"}}>{r.w>0?ratio.toFixed(1)+"×":"—"}</td>
                  <td style={s.td}>{r.sat&&r.w*100>guardrails.maxPositionPct&&<span style={{fontSize:9,color:"var(--red)",fontWeight:500}}>OVER {guardrails.maxPositionPct}%</span>}{r.sat&&r.w<0.02&&<span style={{fontSize:9,color:"var(--text-secondary)"}}>under 2%: grow or exit?</span>}</td>
                </tr>;
              })}
            </tbody>
          </table>
          <div style={{marginTop:10,fontSize:11,color:"var(--text-secondary)"}}>
            Share of risk is each position&apos;s contribution to portfolio variance, using placeholder assumptions: volatility of {Object.entries(RISK_VOL).filter(([,v])=>v>0).map(([k,v])=>`${k} ${(v*100).toFixed(0)}%`).join(", ")}, and fixed correlations between asset types. It shows relative size, not a forecast. &quot;Risk ÷ weight&quot; above 1 means the position adds more risk than its size suggests.
          </div>
        </div>

        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          <div style={s.card}>
            <div style={s.sec}>Policy limits</div>
            <NumIn label="Satellites, max % of Bucket A" value={tpa.satMaxPct} step={1} onChange={setT("satMaxPct")}/>
            <NumIn label="Crypto, max % of portfolio" value={tpa.cryptoMaxPct} step={1} onChange={setT("cryptoMaxPct")}/>
            <NumIn label="Crypto dollar cap (CAD)" value={tpa.cryptoCapCad} onChange={setT("cryptoCapCad")} hint="0 = not set"/>
            <NumIn label="Cash buffer, min months" value={tpa.cashMonthsMin} step={0.5} onChange={setT("cashMonthsMin")}/>
            <NumIn label="Cash buffer, max months" value={tpa.cashMonthsMax} step={0.5} onChange={setT("cashMonthsMax")}/>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:4}}>The single-position limit ({guardrails.maxPositionPct}%) is set on the Stocks tab.</div>
          </div>
          <div style={s.card}>
            <div style={s.sec}>Liquidity inputs</div>
            <NumIn label="Monthly spending (CAD)" value={tpa.monthlySpend} onChange={setT("monthlySpend")}/>
            <NumIn label="Cash held elsewhere (CAD)" value={tpa.otherCash} onChange={setT("otherCash")} hint="chequing, savings"/>
            <NumIn label="Credit line limit (CAD)" value={tpa.creditLimit} onChange={setT("creditLimit")}/>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:4}}>Credit line drawn is read from the CSV (a negative CAD balance): {fmt(creditDrawn)}. These amounts are stored in this browser only.</div>
          </div>
        </div>
      </div>}

      {/* ====== BALANCE SHEET TAB ====== */}
      {tab==="balance"&&<div>
        <div style={s.g("repeat(auto-fit, minmax(150px, 1fr))")}>
          <M label="Whole-of-life assets" value={fmt(wolTotal)} sub="Liquid portfolio plus pensions"/>
          <M label="Equity-like share" value={pct(wolEq)} sub="Of whole-of-life assets"/>
          <M label="Locked (Bucket C)" value={pct(wolTotal>0?bucketC/wolTotal:0)} sub={fmt(bucketC)}/>
          <M label="Credit line drawn" value={fmt(creditDrawn)} color={creditDrawn>0?"var(--red)":"var(--green)"} sub={creditUse!=null?`${pct(creditUse)} of limit`:"Set the limit on the TPA tab"}/>
        </div>

        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          <div style={s.card}>
            <div style={s.sec}>Whole-of-life asset mix</div>
            <Bar h={18} segments={wol.map(x=>({label:x.l,pct:wolTotal>0?x.v/wolTotal:0,color:x.c}))}/>
            <div style={{marginTop:10}}>
              {wol.map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{width:9,height:9,borderRadius:2,background:x.c,flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{x.l}</span>
                <span style={{fontSize:11,color:"var(--text-secondary)"}}>{fmt(x.v)}</span>
                <span style={{fontSize:12,fontWeight:500,minWidth:42,textAlign:"right"}}>{pct(wolTotal>0?x.v/wolTotal:0)}</span>
              </div>)}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sec}>Assets outside this CSV</div>
            <NumIn label="UK pension (GBP)" value={tpa.ukPensionGbp} onChange={setT("ukPensionGbp")}/>
            <NumIn label="CAD per GBP" value={tpa.gbpCad} step={0.01} onChange={setT("gbpCad")}/>
            <NumIn label="Workplace DC plan (CAD)" value={tpa.workplaceDc} onChange={setT("workplaceDc")}/>
            <NumIn label="DB plan commuted value (CAD)" value={tpa.dbCommuted} onChange={setT("dbCommuted")}/>
            <NumIn label="Student loan balance (GBP)" value={tpa.studentLoanGbp} onChange={setT("studentLoanGbp")} hint="memo only"/>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:4}}>Stored in this browser only. Nothing here is sent anywhere.</div>
          </div>
        </div>

        <div style={{...s.g("1fr 1fr"),marginTop:12}}>
          <div style={s.card}>
            <div style={s.sec}>Buckets</div>
            {[{l:"Bucket 0: liquidity (cash)",v:cashAll,d:cashMonths!=null?`${cashMonths.toFixed(1)} months of spending, target ${tpa.cashMonthsMin}–${tpa.cashMonthsMax}`:"Set monthly spending on the TPA tab"},
              {l:"Bucket A: long-term wealth",v:bucketA,d:"Liquid portfolio excluding cash"},
              {l:"Bucket B: house",v:0,d:"Not set up yet"},
              {l:"Bucket C: locked pensions",v:bucketC,d:"UK pension, workplace DC plan, DB plan"}].map(b=>
              <div key={b.l} style={{padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:500}}>{b.l}</span><span style={{fontSize:12,fontWeight:500}}>{fmt(b.v)}</span></div>
                <div style={{fontSize:11,color:"var(--text-secondary)"}}>{b.d}</div>
              </div>)}
          </div>
          <div style={s.card}>
            <div style={s.sec}>Liabilities and liquidity</div>
            <div style={{padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:500}}>Credit line drawn</span><span style={{fontSize:12,fontWeight:500}}>{fmt(creditDrawn)}</span></div>
              <div style={{fontSize:11,color:"var(--text-secondary)"}}>{n("creditLimit")>0?`Limit ${fmt(n("creditLimit"))}. If pledged assets fell 40%, the limit would be about ${fmt(n("creditLimit")*0.6)}.`:"Set the limit on the TPA tab to see headroom."}</div>
            </div>
            <div style={{padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:500}}>Student loan (memo)</span><span style={{fontSize:12,fontWeight:500}}>{fmt(n("studentLoanGbp")*n("gbpCad"))}</span></div>
              <div style={{fontSize:11,color:"var(--text-secondary)"}}>Face value. Repayments are income-linked and the balance can be written off, so it is not counted as leverage here.</div>
            </div>
            <div style={{padding:"6px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:500}}>Net of credit line</span><span style={{fontSize:12,fontWeight:500}}>{fmt(wolTotal-creditDrawn)}</span></div>
              <div style={{fontSize:11,color:"var(--text-secondary)"}}>Whole-of-life assets minus the credit line. Government pensions are not valued.</div>
            </div>
          </div>
        </div>
      </div>}

    </div>
  );
}
