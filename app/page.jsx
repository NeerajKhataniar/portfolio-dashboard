"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Papa from "papaparse";

// ─── STATIC DATA ──────────────────────────────────────────────
const MER = {XEQT:0.20,WSRI:0.20,WSRD:0.22,WSGB:0.35,VCB:0.09,VCN:0.05,VDY:0.22,VEE:0.24,VIDY:0.22,VIU:0.22,VUN:0.16,VAB:0.09,VBG:0.22,VBU:0.22,VYM:0.06,VWOB:0.20,ZHY:0.40,ZFL:0.20,XST:0.61,XCH:0.67,CIF:0.62,OUNZ:0.25,GLDM:0.10,"KILO.B":0.23,BTC:null,ETH:null};

const CATEGORY_MAP = {CRYPTOCURRENCY:"crypto",EXCHANGE_TRADED_FUND:"ETF",STOCK:"stock",EQUITY:"stock"};
const FUND_CAT = {VAB:"bond",VBG:"bond",VBU:"bond",VCB:"bond",VWOB:"bond",ZHY:"bond",ZFL:"bond",WSGB:"bond",OUNZ:"gold",GLDM:"gold","KILO.B":"gold"};

const THEME_COLORS = {"AI":"#7F77DD","Energy":"#1D9E75","Defence":"#378ADD","Healthcare":"#D4537E","Fintech":"#534AB7","Infrastructure":"#EF9F27","Consumer":"#D85A30","Other":"#888"};
const THEME_LIST = Object.keys(THEME_COLORS);

// Guardrail defaults
const DEFAULT_GUARDRAILS = {maxPositionPct:5,maxThemePct:30,drawdownAlert:20,minConviction:3};

const SECTOR_DATA = {
  XEQT:{Financials:21.0,Technology:20.0,Industrials:12.3,"Consumer cyclical":8.4,Materials:8.1,Healthcare:7.2,Energy:6.8,Communication:6.5,"Consumer defensive":4.7,Utilities:2.8,"Real estate":2.3},
  WSRI:{Technology:26.5,Financials:17.0,Healthcare:13.0,Industrials:11.0,"Consumer cyclical":9.0,"Consumer defensive":6.0,Communication:5.5,Energy:4.0,Materials:3.5,Utilities:2.5,"Real estate":2.0},
  WSRD:{Financials:22.0,Industrials:16.0,Healthcare:11.0,"Consumer cyclical":10.5,Technology:10.0,"Consumer defensive":7.5,Materials:7.0,Communication:4.5,Energy:4.0,Utilities:4.5,"Real estate":3.0},
  VCN:{Financials:35.0,Energy:14.0,Industrials:12.0,Materials:10.0,Technology:8.5,"Consumer cyclical":4.5,Utilities:4.5,Communication:4.0,"Consumer defensive":3.5,Healthcare:2.0,"Real estate":2.0},
  VDY:{Financials:52.0,Energy:18.0,Utilities:11.0,Communication:8.0,Industrials:4.0,Materials:3.0,"Consumer defensive":2.0,"Real estate":2.0},
  VUN:{Technology:30.0,Healthcare:12.5,Financials:12.0,"Consumer cyclical":10.5,Industrials:9.0,Communication:8.5,"Consumer defensive":5.0,Energy:3.5,Utilities:2.5,"Real estate":3.0,Materials:3.5},
  VIU:{Financials:20.0,Industrials:16.0,Healthcare:11.0,"Consumer cyclical":11.0,Technology:9.5,"Consumer defensive":8.0,Materials:6.5,Communication:4.5,Energy:4.0,Utilities:5.0,"Real estate":4.5},
  VEE:{Financials:22.0,Technology:20.0,"Consumer cyclical":12.0,Communication:9.0,Energy:6.0,Materials:6.0,Industrials:6.0,"Consumer defensive":6.0,Healthcare:4.0,Utilities:3.5,"Real estate":5.5},
  VIDY:{Financials:28.0,Industrials:12.0,"Consumer defensive":10.0,Healthcare:9.0,Utilities:9.0,Materials:7.0,Energy:6.0,Communication:6.0,"Consumer cyclical":5.0,Technology:4.5,"Real estate":3.5},
  VYM:{Financials:21.0,Healthcare:13.0,"Consumer defensive":12.0,Industrials:11.0,Energy:10.0,Technology:8.0,Utilities:8.0,Communication:5.0,"Consumer cyclical":5.0,Materials:4.0,"Real estate":3.0},
  XST:{"Consumer defensive":100},
  XCH:{Technology:25.0,Financials:18.0,"Consumer cyclical":16.0,Communication:12.0,Industrials:8.0,Energy:5.0,Healthcare:5.0,Materials:4.0,"Real estate":4.0,Utilities:3.0},
  CIF:{Utilities:40.0,Industrials:25.0,Energy:15.0,"Real estate":10.0,Communication:5.0,Technology:5.0},
};

const GEO_DATA = {
  XEQT:{Canada:26.8,US:42.3,"Intl developed":25.3,Emerging:5.6},WSRI:{Canada:5.0,US:85.0,"Intl developed":10.0},WSRD:{"Intl developed":90.0,Emerging:5.0,Canada:5.0},
  VCN:{Canada:100},VDY:{Canada:100},XST:{Canada:100},VUN:{US:100},VYM:{US:100},VIU:{"Intl developed":100},VIDY:{"Intl developed":100},VEE:{Emerging:100},XCH:{Emerging:100},
  CIF:{US:40,"Intl developed":35,Emerging:15,Canada:10},VAB:{Canada:100},VCB:{Canada:100},VBG:{"Intl developed":100},VBU:{US:100},
  VWOB:{Emerging:100},ZHY:{US:100},WSGB:{Canada:50,US:50},ZFL:{Canada:100},OUNZ:{Global:100},GLDM:{Global:100},"KILO.B":{Global:100},BTC:{Global:100},ETH:{Global:100},
};

const TOP_STOCKS = {
  XEQT:[{name:"Apple",ticker:"AAPL",pct:4.2},{name:"Microsoft",ticker:"MSFT",pct:3.8},{name:"NVIDIA",ticker:"NVDA",pct:3.1},{name:"Amazon",ticker:"AMZN",pct:2.3},{name:"Royal Bank",ticker:"RY.TO",pct:2.1},{name:"TD Bank",ticker:"TD.TO",pct:1.7},{name:"Meta",ticker:"META",pct:1.5},{name:"Alphabet",ticker:"GOOGL",pct:1.5},{name:"Shopify",ticker:"SHOP.TO",pct:1.3},{name:"BNS",ticker:"BNS.TO",pct:1.1},{name:"Broadcom",ticker:"AVGO",pct:1.1},{name:"JPMorgan",ticker:"JPM",pct:1.0}],
  WSRI:[{name:"Apple",ticker:"AAPL",pct:6.5},{name:"Microsoft",ticker:"MSFT",pct:6.0},{name:"NVIDIA",ticker:"NVDA",pct:5.2},{name:"Amazon",ticker:"AMZN",pct:3.5},{name:"Alphabet",ticker:"GOOGL",pct:3.0},{name:"Meta",ticker:"META",pct:2.5},{name:"Broadcom",ticker:"AVGO",pct:1.8},{name:"JPMorgan",ticker:"JPM",pct:1.5}],
  WSRD:[{name:"Novo Nordisk",ticker:"NVO",pct:2.8},{name:"ASML",ticker:"ASML",pct:2.5},{name:"Nestle",ticker:"NESN",pct:1.8},{name:"Roche",ticker:"ROG",pct:1.6},{name:"SAP",ticker:"SAP",pct:1.5},{name:"AstraZeneca",ticker:"AZN",pct:1.4},{name:"Toyota",ticker:"TM",pct:1.2},{name:"LVMH",ticker:"MC",pct:1.1}],
};

const STRESS = {
  rate_hike:{name:"Rate hike +100bps",desc:"Bonds fall, rate-sensitive equities drop, financials benefit.",impacts:{equity:-0.04,bond:-0.06,gold:-0.02,crypto:-0.08,sectors:{Technology:-0.06,Utilities:-0.07,"Real estate":-0.08,Financials:0.02}}},
  rate_cut:{name:"Rate cut -100bps",desc:"Bonds rally, growth stocks benefit, gold up on lower real yields.",impacts:{equity:0.04,bond:0.05,gold:0.04,crypto:0.06,sectors:{Technology:0.06,Utilities:0.05,"Real estate":0.06,Financials:-0.02}}},
  recession:{name:"Global recession",desc:"Broad equity sell-off, flight to quality bonds, gold safe haven.",impacts:{equity:-0.25,bond:0.04,gold:0.12,crypto:-0.40,sectors:{Technology:-0.30,"Consumer cyclical":-0.32,Financials:-0.28,Energy:-0.35,"Consumer defensive":-0.10,Healthcare:-0.12,Utilities:-0.08,Industrials:-0.22,Materials:-0.25}}},
  inflation:{name:"Inflation spike +3%",desc:"Commodities and energy up, growth stocks and bonds suffer.",impacts:{equity:-0.08,bond:-0.10,gold:0.15,crypto:0.05,sectors:{Energy:0.10,Materials:0.08,Technology:-0.12}}},
  cad_drop:{name:"CAD -10%",desc:"USD and intl holdings gain in CAD terms.",impacts:{equity:0.0,bond:0.0,gold:0.05,crypto:0.0,currency:{US:0.10,"Intl developed":0.06,Emerging:0.04,Canada:0.0,Global:0.08}}},
  tech_crash:{name:"Tech crash -30%",desc:"Tech-specific correction. Heavy impact through XEQT and WSRI.",impacts:{equity:-0.06,bond:0.02,gold:0.03,crypto:-0.15,sectors:{Technology:-0.30,Communication:-0.15}}},
  em_crisis:{name:"EM crisis",desc:"EM currencies collapse, capital flight. Direct hit on VEE, XCH, VWOB.",impacts:{equity:-0.03,bond:-0.02,gold:0.05,crypto:-0.10,geo:{Emerging:-0.25,Canada:0.0,US:-0.02,"Intl developed":-0.05,Global:0.0}}},
};

// ─── HELPERS ──────────────────────────────────────────────
const fmt = n => n.toLocaleString("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:0,maximumFractionDigits:0});
const fmtD = n => n.toLocaleString("en-CA",{style:"currency",currency:"CAD",minimumFractionDigits:2,maximumFractionDigits:2});
const pct = n => (n*100).toFixed(1)+"%";
const CC = {equity:"#1D9E75",bond:"#378ADD",gold:"#EF9F27",crypto:"#7F77DD",stock:"#D85A30"};
const CL = {equity:"Equity ETFs",bond:"Bond ETFs",gold:"Gold ETFs",crypto:"Crypto",stock:"Stocks"};
const SC = {"Financials":"#378ADD","Technology":"#7F77DD","Industrials":"#888","Consumer cyclical":"#D85A30","Materials":"#EF9F27","Healthcare":"#D4537E","Energy":"#1D9E75","Communication":"#534AB7","Consumer defensive":"#639922","Utilities":"#0F6E56","Real estate":"#854F0B"};
const GCC = {"Canada":"#E24B4A","US":"#378ADD","Intl developed":"#1D9E75","Emerging":"#EF9F27","Global":"#7F77DD"};

// ─── CSV PARSER ──────────────────────────────────────────────
function parseWealthsimpleCSV(csvText) {
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter(r => r.Symbol && r.Symbol.trim());
  return rows.map(r => {
    const sym = r.Symbol.trim();
    const secType = r["Security Type"] || "";
    const baseCat = CATEGORY_MAP[secType] || "ETF";
    const isStock = ["STOCK","EQUITY"].includes(secType) || (secType !== "CRYPTOCURRENCY" && secType !== "EXCHANGE_TRADED_FUND" && !FUND_CAT[sym] && secType !== "");
    const category = secType === "CRYPTOCURRENCY" ? "crypto" : isStock ? "stock" : (FUND_CAT[sym] || "equity");
    const mvCurr = r["Market Value Currency"] || "CAD";
    const mv = parseFloat(r["Market Value"]) || 0;
    return {
      sym,
      name: r.Name || sym,
      acct: r["Account Name"] || "",
      acctType: r["Account Type"] || "",
      acctClass: r["Account Classification"] || "",
      acctNum: (r["Account Number"] || "").slice(0, 4),
      type: baseCat,
      category,
      qty: parseFloat(r.Quantity) || 0,
      price: parseFloat(r["Market Price"]) || 0,
      pCurr: r["Market Price Currency"] || "CAD",
      mv, mvCurr,
      book: parseFloat(r["Book Value (CAD)"]) || 0,
      unreal: parseFloat(r["Market Unrealized Returns"]) || 0,
      unrealCurr: r["Market Unrealized Returns Currency"] || "CAD",
      exchange: r.Exchange || "",
      mic: r.MIC || "",
      mer: MER[sym] !== undefined ? MER[sym] : null,
    };
  });
}

// ─── COMPONENTS ──────────────────────────────────────────────
const s = {
  card: {background:"var(--bg-primary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"1rem 1.25rem"},
  th: {fontSize:11,fontWeight:500,color:"var(--text-secondary)",padding:"5px 6px",textAlign:"left",cursor:"pointer",userSelect:"none",borderBottom:"0.5px solid var(--border)",whiteSpace:"nowrap"},
  td: {fontSize:12,padding:"6px 6px",borderBottom:"0.5px solid var(--border)"},
  badge: c=>({fontSize:10,padding:"2px 7px",borderRadius:"var(--radius)",background:c+"1a",color:c,fontWeight:500,whiteSpace:"nowrap"}),
  sec: {fontSize:14,fontWeight:500,marginBottom:"0.7rem"},
  g: c=>({display:"grid",gridTemplateColumns:c,gap:12}),
};

function M({label,value,sub,color}){return <div style={{background:"var(--bg-secondary)",borderRadius:"var(--radius)",padding:"0.6rem 0.85rem",minWidth:0}}>
  <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:2}}>{label}</div>
  <div style={{fontSize:19,fontWeight:500,color:color||"var(--text-primary)"}}>{value}</div>
  {sub&&<div style={{fontSize:10,color:"var(--text-secondary)",marginTop:1}}>{sub}</div>}</div>;}

function Donut({segments,size=148,t=24}){const r=(size-t)/2,cx=size/2,cy=size/2,ci=2*Math.PI*r;let o=0;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{segments.map((seg,i)=>{const d=seg.pct*ci,g=ci-d,off=o;o+=d;
    return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={t} strokeDasharray={`${d} ${g}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>;})}</svg>;}

function Bar({segments,h=20}){return <div style={{display:"flex",borderRadius:"var(--radius)",overflow:"hidden",height:h,width:"100%"}}>
  {segments.filter(sg=>sg.pct>0.004).map((sg,i)=><div key={i} style={{width:pct(sg.pct),background:sg.color,minWidth:sg.pct>0.015?2:0}} title={`${sg.label}: ${pct(sg.pct)}`}/>)}</div>;}

// ─── MAIN PAGE ──────────────────────────────────────────────
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
  const [stockThemes, setStockThemes] = useState({}); // { sym: "AI" }
  const [stockNotes, setStockNotes] = useState({}); // { sym: "thesis text" }
  const [stockBuyDates, setStockBuyDates] = useState({}); // { sym: "2026-03-17" }

  // Load settings from localStorage
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
        if (p.guardrails) setGuardrails(p.guardrails);
        if (p.stockThemes) setStockThemes(p.stockThemes);
        if (p.stockNotes) setStockNotes(p.stockNotes);
        if (p.stockBuyDates) setStockBuyDates(p.stockBuyDates);
      }
      const savedHoldings = localStorage.getItem("portfolio-holdings");
      if (savedHoldings) {
        const h = JSON.parse(savedHoldings);
        setRawHoldings(h.holdings);
        setCsvDate(h.date);
      }
    } catch (e) {}
  }, []);

  // Save settings
  useEffect(() => {
    try { localStorage.setItem("portfolio-settings", JSON.stringify({targets,subTargets,feeBudget,sectorTargets,threshold,guardrails,stockThemes,stockNotes,stockBuyDates})); } catch(e){}
  }, [targets, subTargets, feeBudget, sectorTargets, threshold, guardrails, stockThemes, stockNotes, stockBuyDates]);

  // Save holdings
  useEffect(() => {
    if (rawHoldings) {
      try { localStorage.setItem("portfolio-holdings", JSON.stringify({holdings:rawHoldings,date:csvDate})); } catch(e){}
    }
  }, [rawHoldings, csvDate]);

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
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
        body: JSON.stringify({holdings: rawHoldings.map(h => ({sym: h.sym, exchange: h.exchange || h.mic}))})
      });
      const data = await res.json();
      if (data.prices) {
        setLivePrices(data.prices);
        setLastPriceFetch(new Date().toLocaleTimeString());
        // Try to get USD/CAD from the response
        if (data.prices.BTC && data.prices.BTC.currency === "CAD") {
          // BTC-CAD gives us CAD pricing directly
        }
      }
    } catch (e) { console.error("Price fetch failed:", e); }
    setPriceLoading(false);
  }, [rawHoldings, priceLoading]);

  // ─── DERIVED DATA ──────────────────────────────────────────
  const toCAD = useCallback((v, c) => c === "USD" ? v * usdCad : v, [usdCad]);

  const holdings = useMemo(() => {
    if (!rawHoldings) return [];
    return rawHoldings.map(h => {
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

  const sectorExp = useMemo(()=>{const sec={};holdings.forEach(h=>{const sd=SECTOR_DATA[h.sym];if(!sd)return;Object.entries(sd).forEach(([k,p])=>{sec[k]=(sec[k]||0)+h.mvCad*(p/100);});});
    return Object.entries(sec).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({s:k,v,p:v/totalCad}));}, [holdings,totalCad]);

  const geoExp = useMemo(()=>{const g={};holdings.forEach(h=>{const gd=GEO_DATA[h.sym];if(!gd)return;Object.entries(gd).forEach(([k,p])=>{g[k]=(g[k]||0)+h.mvCad*(p/100);});});
    return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({g:k,v,p:v/totalCad}));}, [holdings,totalCad]);

  const topStocks = useMemo(()=>{const st={};const add=(list,sym)=>{const fh=holdings.find(h=>h.sym===sym);if(!fh)return;
    list.forEach(sk=>{const v=fh.mvCad*(sk.pct/100);if(!st[sk.ticker])st[sk.ticker]={name:sk.name,ticker:sk.ticker,v:0};st[sk.ticker].v+=v;});};
    Object.entries(TOP_STOCKS).forEach(([sym,list])=>add(list,sym));
    return Object.values(st).sort((a,b)=>b.v-a.v).map(sk=>({...sk,pp:sk.v/totalCad}));}, [holdings,totalCad]);

  const stressRes = useMemo(()=>{const sc=STRESS[scenario];if(!sc)return null;const imp=sc.impacts;
    return holdings.map(h=>{let shock=imp[h.category]||0;const sd=SECTOR_DATA[h.sym];
      if(sd&&imp.sectors){let ss=0,tw=0;Object.entries(sd).forEach(([sec,w])=>{if(imp.sectors[sec]!=null){ss+=w*imp.sectors[sec];tw+=w;}});if(tw>0)shock=ss/100;else if(imp[h.category]!=null)shock=imp[h.category];}
      if(imp.currency){const gd=GEO_DATA[h.sym];if(gd){let cs=0;Object.entries(gd).forEach(([g,w])=>{cs+=(w/100)*(imp.currency[g]||0);});shock+=cs;}}
      if(imp.geo){const gd=GEO_DATA[h.sym];if(gd){let gs=0;Object.entries(gd).forEach(([g,w])=>{gs+=(w/100)*(imp.geo[g]||0);});shock+=gs;}}
      return {...h,shock,impact:h.mvCad*shock};});}, [holdings,scenario]);

  const totalImpact = useMemo(()=>stressRes?stressRes.reduce((a,h)=>a+h.impact,0):0,[stressRes]);

  const catSeg = useMemo(()=>Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>({label:CL[c]||c,pct:v/totalCad,color:CC[c]||"#888"})),[byCat,totalCad]);
  const sorted = useMemo(()=>[...holdings].sort((a,b)=>{const av=sortCol==="sym"?a.sym:a[sortCol],bv=sortCol==="sym"?b.sym:b[sortCol];return typeof av==="string"?av.localeCompare(bv)*sortDir:(av-bv)*sortDir;}),[holdings,sortCol,sortDir]);
  const ts = c=>{if(sortCol===c)setSortDir(d=>d*-1);else{setSortCol(c);setSortDir(-1);}};
  const fPct = totalCad>0?holdings.filter(h=>h.type==="ETF").reduce((a,h)=>a+h.mvCad,0)/totalCad:0;
  const cPct = totalCad>0?(byCat.crypto||0)/totalCad:0;
  const thD = threshold/100;
  const ac = ["#1D9E75","#378ADD","#7F77DD"];

  // Rebalance trades
  const trades = useMemo(()=>{
    if(!holdings.length)return[];const list=[];const stgt=k=>subTargets[k]/100;const tgt=k=>targets[k]/100;
    const catTarget={equity:stgt("equity")*totalCad,bond:stgt("bond")*totalCad,gold:stgt("gold")*totalCad};
    const catActual={equity:holdings.filter(h=>h.category==="equity").reduce((a,h)=>a+h.mvCad,0),bond:holdings.filter(h=>h.category==="bond").reduce((a,h)=>a+h.mvCad,0),gold:holdings.filter(h=>h.category==="gold").reduce((a,h)=>a+h.mvCad,0)};
    ["equity","bond","gold"].forEach(cat=>{const diff=catTarget[cat]-catActual[cat];if(Math.abs(diff)>totalCad*thD){
      const ch=holdings.filter(h=>h.category===cat&&h.acctClass==="Self-Directed").sort((a,b)=>b.mvCad-a.mvCad);
      if(diff>0&&ch.length>0)list.push({action:"BUY",sym:ch[0].sym,name:ch[0].name,amount:Math.round(diff),reason:`${CL[cat]} underweight by ${fmt(Math.abs(diff))}`,category:cat});
      else if(diff<0&&ch.length>0)list.push({action:"SELL",sym:ch[0].sym,name:ch[0].name,amount:Math.round(Math.min(Math.abs(diff),ch[0].mvCad)),reason:`${CL[cat]} overweight by ${fmt(Math.abs(diff))}`,category:cat});
    }});
    if(tgt("stocks")>0)list.push({action:"BUY",sym:"—",name:"Individual stock picks",amount:Math.round(tgt("stocks")*totalCad),reason:`Stocks target: ${targets.stocks}%, currently 0%`,category:"stock"});
    const cryptoDiff=(tgt("crypto")*totalCad)-(byCat.crypto||0);
    if(Math.abs(cryptoDiff)>totalCad*thD)list.push({action:cryptoDiff>0?"BUY":"SELL",sym:"BTC/ETH",name:"Crypto",amount:Math.round(Math.abs(cryptoDiff)),reason:`Crypto target: ${targets.crypto}%, actual: ${(cPct*100).toFixed(1)}%`,category:"crypto"});
    return list;
  },[holdings,totalCad,targets,subTargets,byCat,thD,cPct]);

  const feeOverBudget = totalFees > feeBudget;
  const feeTrades = useMemo(()=>{if(!feeOverBudget)return[];
    const excess=totalFees-feeBudget;const exp=[...holdings].filter(h=>h.mer!=null&&h.mer>0.25&&h.acctClass==="Self-Directed").sort((a,b)=>b.annualFee-a.annualFee);
    const list=[];let saved=0;for(const h of exp){if(saved>=excess)break;list.push({sym:h.sym,name:h.name,mer:h.mer,fee:h.annualFee,suggestion:`Replace ${h.sym} (${h.mer}% MER) with lower-cost alternative`});saved+=h.annualFee;}
    return list;},[holdings,totalFees,feeBudget,feeOverBudget]);

  const sectorDiffs = useMemo(()=>sectorExp.map(se=>{const target=sectorTargets[se.s]||0;return {...se,target,diff:se.p*100-target};}).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)),[sectorExp,sectorTargets]);

  // ─── UPLOAD SCREEN ──────────────────────────────────────────
  if (!rawHoldings) {
    return <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
        style={{border:`2px dashed ${dragOver?"var(--green)":"var(--border)"}`,borderRadius:"var(--radius-lg)",padding:"3rem",textAlign:"center",maxWidth:480,width:"100%",transition:"border-color 0.2s"}}>
        <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Portfolio dashboard</div>
        <div style={{fontSize:13,color:"var(--text-secondary)",marginBottom:20,lineHeight:1.7}}>
          Drop your Wealthsimple holdings CSV here, or click to browse.
          Export from Wealthsimple web → Statements → Custom → Holdings report.
        </div>
        <label style={{display:"inline-block",padding:"8px 20px",background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",cursor:"pointer",fontSize:13,fontWeight:500}}>
          Choose CSV file
          <input type="file" accept=".csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0]);}}/>
        </label>
      </div>
    </div>;
  }

  const TABS = ["overview","holdings","exposure","stocks","stress","rebalance"];

  // ─── DASHBOARD ──────────────────────────────────────────────
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
      <div style={{display:"flex",gap:2,borderBottom:"0.5px solid var(--border)"}}>
        {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"0.4rem 0.8rem",fontSize:13,fontWeight:tab===t?500:400,border:"none",background:"none",color:tab===t?"var(--text-primary)":"var(--text-secondary)",borderBottom:tab===t?"2px solid var(--text-primary)":"2px solid transparent",marginBottom:-1}}>{({overview:"Overview",holdings:"Holdings",exposure:"Exposure",stocks:"Stocks",stress:"Stress test",rebalance:"Rebalance"})[t]}</button>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:11,color:"var(--text-tertiary)"}}>
          CSV: {csvDate || "—"}{lastPriceFetch ? ` | Prices: ${lastPriceFetch}` : ""}
        </div>
        <button onClick={fetchPrices} disabled={priceLoading} style={{padding:"4px 12px",fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text-primary)",opacity:priceLoading?0.5:1}}>
          {priceLoading?"Fetching...":"Refresh prices"}
        </button>
        <label style={{padding:"4px 12px",fontSize:11,background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",cursor:"pointer",color:"var(--text-primary)"}}>
          Upload CSV<input type="file" accept=".csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0]);}}/>
        </label>
      </div>
    </div>

    {tab==="overview"&&<div>
      <div style={{...s.g("1fr 1fr 1fr 1fr 1fr"),marginBottom:"1.2rem"}}>
        <M label="Total portfolio" value={fmt(totalCad)} sub={csvDate}/>
        <M label="Unrealized P&L" value={(totalUnreal>=0?"+":"")+fmtD(totalUnreal)} color={totalUnreal>=0?"var(--green)":"var(--red)"} sub={((totalUnreal/totalBook)*100).toFixed(1)+"% return"}/>
        <M label="Weighted MER" value={wMER.toFixed(2)+"%"} sub={fmt(totalFees)+"/yr fees"}/>
        <M label="Positions" value={holdings.length} sub={Object.keys(byAcct).length+" accounts"}/>
        <M label="Stocks alloc" value="0%" sub="Target: 25%" color="var(--coral)"/>
      </div>
      <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
        <div style={s.card}><div style={s.sec}>Asset class breakdown</div>
          <div style={{display:"flex",alignItems:"center",gap:20}}><Donut segments={catSeg}/>
          <div style={{flex:1}}>{catSeg.map(sg=><div key={sg.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <div style={{width:9,height:9,borderRadius:2,background:sg.color,flexShrink:0}}/><span style={{fontSize:12,flex:1}}>{sg.label}</span><span style={{fontSize:12,fontWeight:500}}>{pct(sg.pct)}</span></div>)}</div></div></div>
        <div style={s.card}><div style={s.sec}>Account breakdown</div>
          <Bar h={18} segments={Object.entries(byAcct).map(([n,d],i)=>({label:n,pct:d.t/totalCad,color:ac[i%3]}))}/>
          <div style={{marginTop:10}}>{Object.entries(byAcct).map(([n,d],i)=><div key={n} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <div style={{width:9,height:9,borderRadius:2,background:ac[i%3],flexShrink:0}}/><span style={{fontSize:12,flex:1}}>{n}</span><span style={{fontSize:11,color:"var(--text-secondary)"}}>{d.cls}</span><span style={{fontSize:12,fontWeight:500}}>{fmt(d.t)}</span></div>)}</div></div>
      </div>
      <div style={s.g("1fr 1fr")}>
        <div style={s.card}><div style={s.sec}>Geographic exposure</div>
          <Bar h={18} segments={geoExp.map(g=>({label:g.g,pct:g.p,color:GCC[g.g]||"#888"}))}/>
          <div style={{marginTop:10}}>{geoExp.map(g=><div key={g.g} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:9,height:9,borderRadius:2,background:GCC[g.g]||"#888",flexShrink:0}}/><span style={{fontSize:12,flex:1}}>{g.g}</span><span style={{fontSize:12,fontWeight:500}}>{fmt(g.v)}</span><span style={{fontSize:11,color:"var(--text-secondary)"}}>{pct(g.p)}</span></div>)}</div></div>
        <div style={s.card}><div style={s.sec}>Sector exposure</div>
          <Bar h={18} segments={sectorExp.slice(0,11).map(se=>({label:se.s,pct:se.p,color:SC[se.s]||"#888"}))}/>
          <div style={{marginTop:10}}>{sectorExp.slice(0,8).map(se=><div key={se.s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:9,height:9,borderRadius:2,background:SC[se.s]||"#888",flexShrink:0}}/><span style={{fontSize:12,flex:1}}>{se.s}</span><span style={{fontSize:12,fontWeight:500}}>{fmt(se.v)}</span><span style={{fontSize:11,color:"var(--text-secondary)"}}>{pct(se.p)}</span></div>)}</div></div>
      </div>
    </div>}

    {tab==="holdings"&&<div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
        {[["sym","Symbol"],["name","Name"],["acct","Account"],["category","Type"],["mer","MER"],["mvCad","Value"],["unrealCad","P&L"],["change","Day %"],["annualFee","Fee/yr"]].map(([c,l])=>
          <th key={c} style={s.th} onClick={()=>ts(c)}>{l}{sortCol===c?(sortDir===1?" ↑":" ↓"):""}</th>)}
      </tr></thead><tbody>{sorted.map(h=><tr key={h.sym+h.acctNum}>
        <td style={{...s.td,fontWeight:500}}>{h.sym}</td>
        <td style={{...s.td,color:"var(--text-secondary)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
        <td style={{...s.td,fontSize:11}}>{h.acct}</td>
        <td style={s.td}><span style={s.badge(CC[h.category])}>{h.category}</span></td>
        <td style={{...s.td,textAlign:"right"}}>{h.mer!=null?h.mer.toFixed(2)+"%":"—"}</td>
        <td style={{...s.td,textAlign:"right",fontWeight:500}}>{fmtD(h.mvCad)}</td>
        <td style={{...s.td,textAlign:"right",color:h.unrealCad>=0?"var(--green)":"var(--red)"}}>{(h.unrealCad>=0?"+":"")+fmtD(h.unrealCad)}</td>
        <td style={{...s.td,textAlign:"right",color:h.change!=null?(h.change>=0?"var(--green)":"var(--red)"):"var(--text-tertiary)"}}>{h.change!=null?(h.change>=0?"+":"")+h.change.toFixed(2)+"%":"—"}</td>
        <td style={{...s.td,textAlign:"right",color:"var(--text-secondary)"}}>{h.annualFee>0?fmtD(h.annualFee):"—"}</td>
      </tr>)}</tbody></table>
      <div style={{marginTop:10,padding:"0.6rem 1rem",background:"var(--bg-secondary)",borderRadius:"var(--radius)",display:"flex",gap:20,fontSize:12}}>
        <span>Total: <b>{fmt(totalCad)}</b></span><span>Wtd MER: <b>{wMER.toFixed(2)}%</b></span><span>Fees: <b>{fmtD(totalFees)}/yr</b></span></div>
    </div>}

    {tab==="exposure"&&<div>
      <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
        <div style={s.card}><div style={s.sec}>Sector look-through</div>
          {sectorExp.map(se=><div key={se.s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <div style={{width:9,height:9,borderRadius:2,background:SC[se.s]||"#888",flexShrink:0}}/><span style={{fontSize:12,flex:1}}>{se.s}</span>
            <div style={{width:90,height:7,background:"var(--bg-tertiary)",borderRadius:4,overflow:"hidden"}}><div style={{width:pct(Math.min(se.p/0.25,1)),height:"100%",background:SC[se.s]||"#888"}}/></div>
            <span style={{fontSize:12,fontWeight:500,minWidth:34,textAlign:"right"}}>{pct(se.p)}</span><span style={{fontSize:11,color:"var(--text-secondary)",minWidth:48,textAlign:"right"}}>{fmt(se.v)}</span></div>)}</div>
        <div style={s.card}><div style={s.sec}>Geographic look-through</div>
          {geoExp.map(g=><div key={g.g} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:9,height:9,borderRadius:2,background:GCC[g.g]||"#888",flexShrink:0}}/><span style={{fontSize:13,flex:1,fontWeight:500}}>{g.g}</span>
            <div style={{width:90,height:9,background:"var(--bg-tertiary)",borderRadius:4,overflow:"hidden"}}><div style={{width:pct(Math.min(g.p/0.5,1)),height:"100%",background:GCC[g.g]||"#888"}}/></div>
            <span style={{fontSize:13,fontWeight:500,minWidth:40,textAlign:"right"}}>{pct(g.p)}</span><span style={{fontSize:12,color:"var(--text-secondary)",minWidth:52,textAlign:"right"}}>{fmt(g.v)}</span></div>)}</div>
      </div>
      <div style={s.card}><div style={s.sec}>Top stock exposures (look-through)</div>
        <div style={{...s.g("1fr 1fr"),gap:0}}>{topStocks.slice(0,20).map((sk,i)=><div key={sk.ticker} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderBottom:"0.5px solid var(--border)"}}>
          <span style={{fontSize:11,color:"var(--text-secondary)",width:16}}>{i+1}</span><span style={{fontSize:12,fontWeight:500,flex:1}}>{sk.name}</span>
          <span style={{fontSize:11,color:"var(--text-secondary)"}}>{sk.ticker}</span><span style={{fontSize:12,fontWeight:500,minWidth:48,textAlign:"right"}}>{fmt(sk.v)}</span>
          <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:30,textAlign:"right"}}>{pct(sk.pp)}</span></div>)}</div></div>
    </div>}

    {tab==="stocks"&&<div>
      {(()=>{
        const stockHoldings = holdings.filter(h => h.category === "stock");
        const stockTotal = stockHoldings.reduce((a,h) => a+h.mvCad, 0);
        const stockSleeveTarget = totalCad * targets.stocks / 100;
        const fundLookthrough = topStocks;

        // Theme analysis
        const byTheme = {};
        stockHoldings.forEach(h => {
          const theme = stockThemes[h.sym] || "Other";
          if (!byTheme[theme]) byTheme[theme] = {positions:[],total:0};
          byTheme[theme].positions.push(h);
          byTheme[theme].total += h.mvCad;
        });

        // Guardrail checks
        const violations = [];
        stockHoldings.forEach(h => {
          const pctOfPort = (h.mvCad / totalCad) * 100;
          if (pctOfPort > guardrails.maxPositionPct) violations.push({sym:h.sym,type:"position",msg:`${h.sym} is ${pctOfPort.toFixed(1)}% of portfolio (limit: ${guardrails.maxPositionPct}%)`});
          const drawdown = h.book > 0 ? ((h.mvCad - h.book) / h.book) * 100 : 0;
          if (drawdown < -guardrails.drawdownAlert) violations.push({sym:h.sym,type:"drawdown",msg:`${h.sym} is down ${Math.abs(drawdown).toFixed(1)}% from cost (alert: ${guardrails.drawdownAlert}%)`});
        });
        Object.entries(byTheme).forEach(([theme,data]) => {
          if (stockTotal > 0) {
            const themePct = (data.total / stockTotal) * 100;
            if (themePct > guardrails.maxThemePct && theme !== "Other") violations.push({sym:theme,type:"theme",msg:`"${theme}" theme is ${themePct.toFixed(0)}% of stock sleeve (limit: ${guardrails.maxThemePct}%)`});
          }
        });

        // Combined exposure (fund look-through + direct)
        const combinedExposure = stockHoldings.map(h => {
          const lt = fundLookthrough.find(f => f.ticker === h.sym || f.ticker === h.sym+".TO");
          const fundExp = lt ? lt.v : 0;
          return {...h, fundExposure: fundExp, totalExposure: h.mvCad + fundExp, totalPct: (h.mvCad + fundExp) / totalCad};
        });

        return <>
          <div style={{...s.g("1fr 1fr 1fr 1fr"),marginBottom:"1.2rem"}}>
            <M label="Stock sleeve" value={fmt(stockTotal)} sub={`Target: ${fmt(stockSleeveTarget)}`} color={stockTotal > 0 ? "var(--text-primary)" : "var(--coral)"}/>
            <M label="Deployed" value={stockSleeveTarget > 0 ? Math.round((stockTotal/stockSleeveTarget)*100)+"%" : "0%"} sub={`${stockHoldings.length} of 5-8 slots filled`}/>
            <M label="Remaining to deploy" value={fmt(Math.max(0, stockSleeveTarget - stockTotal))} sub="via new capital + sells"/>
            <M label="Guardrail alerts" value={violations.length} color={violations.length > 0 ? "var(--red)" : "var(--green)"} sub={violations.length === 0 ? "All clear" : "Action needed"}/>
          </div>

          <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
            <div style={s.card}>
              <div style={s.sec}>Guardrail settings</div>
              {[{k:"maxPositionPct",l:"Max single position (% of total portfolio)",min:1,max:15,step:1,unit:"%"},
                {k:"maxThemePct",l:"Max single theme (% of stock sleeve)",min:10,max:50,step:5,unit:"%"},
                {k:"drawdownAlert",l:"Drawdown review trigger (% from cost)",min:5,max:40,step:5,unit:"%"},
                {k:"minConviction",l:"Min research entries before buying",min:1,max:10,step:1,unit:""}
              ].map(({k,l,min,max,step,unit}) => (
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:11,color:"var(--text-secondary)"}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:500}}>{guardrails[k]}{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={guardrails[k]} onChange={e => setGuardrails(g => ({...g,[k]:+e.target.value}))} style={{width:"100%"}}/>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <div style={s.sec}>Alerts</div>
              {violations.length === 0 && stockHoldings.length === 0 && <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.7}}>
                No individual stocks in portfolio yet. When you buy stocks through Wealthsimple and upload a new CSV, they'll appear here with guardrail monitoring.
                <div style={{marginTop:12,padding:"0.6rem",background:"var(--bg-secondary)",borderRadius:"var(--radius)",fontSize:11}}>
                  <div style={{fontWeight:500,marginBottom:4}}>Suggested sell candidates to fund stock sleeve:</div>
                  {["VBG","ZHY","VCN","VWOB","VIU","VDY","VBU","VAB","VUN","VIDY","VEE"].map(sym => {
                    const h = holdings.find(x => x.sym === sym);
                    return h ? <div key={sym} style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                      <span>{sym}</span><span style={{color:h.unrealCad>=0?"var(--green)":"var(--text-secondary)"}}>{fmtD(h.mvCad)}</span>
                    </div> : null;
                  })}
                  <div style={{marginTop:6,paddingTop:6,borderTop:"0.5px solid var(--border)",fontWeight:500,display:"flex",justifyContent:"space-between"}}>
                    <span>Total freeable</span><span>{fmt(holdings.filter(h=>["VBG","ZHY","VCN","VWOB","VIU","VDY","VBU","VAB","VUN","VIDY","VEE"].includes(h.sym)).reduce((a,h)=>a+h.mvCad,0))}</span>
                  </div>
                </div>
              </div>}
              {violations.length === 0 && stockHoldings.length > 0 && <div style={{fontSize:12,color:"var(--green)"}}>All guardrails passing. No action needed.</div>}
              {violations.map((v,i) => <div key={i} style={{padding:"6px 0",borderBottom:"0.5px solid var(--border)"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={s.badge(v.type==="drawdown"?"var(--red)":v.type==="position"?"var(--amber)":"var(--purple)")}>{v.type}</span>
                  <span style={{fontSize:12}}>{v.msg}</span>
                </div>
              </div>)}
            </div>
          </div>

          {stockHoldings.length > 0 && <div style={s.card}>
            <div style={s.sec}>Stock positions</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
              {["Symbol","Name","Theme","Value","P&L","% of portfolio","Total exposure",""].map(h => <th key={h} style={s.th}>{h}</th>)}
            </tr></thead><tbody>
              {combinedExposure.sort((a,b) => b.mvCad - a.mvCad).map(h => {
                const posViol = (h.mvCad/totalCad)*100 > guardrails.maxPositionPct;
                const dd = h.book > 0 ? ((h.mvCad-h.book)/h.book)*100 : 0;
                const ddViol = dd < -guardrails.drawdownAlert;
                return <tr key={h.sym+h.acctNum}>
                  <td style={{...s.td,fontWeight:500}}>{h.sym}</td>
                  <td style={{...s.td,color:"var(--text-secondary)",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</td>
                  <td style={s.td}>
                    <select value={stockThemes[h.sym]||"Other"} onChange={e=>setStockThemes(p=>({...p,[h.sym]:e.target.value}))} style={{fontSize:11,padding:"1px 4px"}}>
                      {THEME_LIST.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{...s.td,textAlign:"right",fontWeight:500}}>{fmtD(h.mvCad)}</td>
                  <td style={{...s.td,textAlign:"right",color:ddViol?"var(--red)":h.unrealCad>=0?"var(--green)":"var(--text-secondary)"}}>
                    {(h.unrealCad>=0?"+":"")+fmtD(h.unrealCad)}
                    {ddViol&&<span style={{fontSize:9,display:"block",color:"var(--red)"}}>review</span>}
                  </td>
                  <td style={{...s.td,textAlign:"right",color:posViol?"var(--red)":"inherit",fontWeight:posViol?500:400}}>
                    {((h.mvCad/totalCad)*100).toFixed(1)}%
                    {posViol&&<span style={{fontSize:9,display:"block",color:"var(--red)"}}>over limit</span>}
                  </td>
                  <td style={{...s.td,textAlign:"right",fontSize:11,color:"var(--text-secondary)"}}>{h.fundExposure > 0 ? `${fmtD(h.totalExposure)} (${pct(h.totalPct)})` : "—"}</td>
                  <td style={s.td}><input placeholder="Thesis..." value={stockNotes[h.sym]||""} onChange={e=>setStockNotes(p=>({...p,[h.sym]:e.target.value}))} style={{width:120,fontSize:10,padding:"2px 4px",background:"var(--bg-secondary)",border:"0.5px solid var(--border)",borderRadius:"var(--radius)",color:"var(--text-primary)"}}/></td>
                </tr>;
              })}
            </tbody></table>
          </div>}

          {Object.keys(byTheme).length > 0 && stockHoldings.length > 0 && <div style={{...s.card,marginTop:12}}>
            <div style={s.sec}>Theme concentration</div>
            <div style={s.g("repeat(auto-fit, minmax(130px, 1fr))")}>
              {Object.entries(byTheme).sort((a,b) => b[1].total - a[1].total).map(([theme,data]) => {
                const pctOfSleeve = stockTotal > 0 ? (data.total/stockTotal)*100 : 0;
                const over = pctOfSleeve > guardrails.maxThemePct && theme !== "Other";
                return <div key={theme} style={{background:"var(--bg-secondary)",borderRadius:"var(--radius)",padding:"0.5rem 0.7rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                    <div style={{width:8,height:8,borderRadius:2,background:THEME_COLORS[theme]||"#888"}}/>
                    <span style={{fontSize:11,fontWeight:500}}>{theme}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:500,color:over?"var(--red)":"inherit"}}>{fmt(data.total)}</div>
                  <div style={{fontSize:11,color:over?"var(--red)":"var(--text-secondary)"}}>{pctOfSleeve.toFixed(0)}% of sleeve {over?"(over limit)":""}</div>
                  <div style={{fontSize:10,color:"var(--text-secondary)"}}>{data.positions.map(p=>p.sym).join(", ")}</div>
                </div>;
              })}
            </div>
          </div>}

          {stockHoldings.length === 0 && <div style={{...s.card,marginTop:0}}>
            <div style={s.sec}>How this tab works</div>
            <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.8}}>
              When you buy individual stocks through Wealthsimple and upload a new CSV, this tab becomes your stock management cockpit. For each position you can assign a theme (AI, Energy, Defence, etc.), write a thesis note, and the dashboard will automatically monitor your guardrails:
              a max of {guardrails.maxPositionPct}% of total portfolio in any single stock,
              a max of {guardrails.maxThemePct}% of the stock sleeve in any one theme,
              a drawdown alert at {guardrails.drawdownAlert}% below cost,
              and a total exposure view showing your direct holdings plus what you own through ETF look-through.
              Adjust the guardrail settings above to match your risk tolerance.
            </div>
          </div>}
        </>;
      })()}
    </div>}

    {tab==="stress"&&stressRes&&<div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:"1.2rem"}}>
        {Object.entries(STRESS).map(([k,v])=><button key={k} onClick={()=>setScenario(k)} style={{padding:"5px 12px",fontSize:12,border:"0.5px solid var(--border)",borderRadius:"var(--radius)",background:scenario===k?"var(--bg-secondary)":"transparent",color:"var(--text-primary)",fontWeight:scenario===k?500:400}}>{v.name}</button>)}</div>
      <div style={{...s.g("1fr 1fr 1fr"),marginBottom:"1.2rem"}}>
        <M label="Current" value={fmt(totalCad)}/><M label="Impact" value={(totalImpact>=0?"+":"")+fmt(totalImpact)} color={totalImpact>=0?"var(--green)":"var(--red)"}/><M label="Stressed" value={fmt(totalCad+totalImpact)} sub={((totalImpact/totalCad)*100).toFixed(1)+"% change"} color={totalImpact>=0?"var(--green)":"var(--red)"}/>
      </div>
      <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
        <div style={s.card}><div style={s.sec}>{STRESS[scenario].name}</div>
          <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:14}}>{STRESS[scenario].desc}</div>
          <div style={s.sec}>By asset class</div>
          {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{const ci=stressRes.filter(h=>h.category===cat).reduce((a,h)=>a+h.impact,0);
            return <div key={cat} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={s.badge(CC[cat])}>{cat}</span><span style={{fontSize:12,flex:1}}>{fmt(val)}</span>
              <span style={{fontSize:12,fontWeight:500,color:ci>=0?"var(--green)":"var(--red)",minWidth:60,textAlign:"right"}}>{ci>=0?"+":""}{fmt(ci)}</span></div>;})}</div>
        <div style={s.card}><div style={s.sec}>Largest impacts</div>
          {[...stressRes].sort((a,b)=>a.impact-b.impact).slice(0,12).map(h=><div key={h.sym+h.acctNum} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <span style={{fontSize:12,fontWeight:500,width:50}}>{h.sym}</span><span style={{fontSize:11,color:"var(--text-secondary)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
            <span style={{fontSize:12,fontWeight:500,color:h.impact>=0?"var(--green)":"var(--red)",minWidth:58,textAlign:"right"}}>{h.impact>=0?"+":""}{fmt(h.impact)}</span></div>)}</div>
      </div>
      <div style={{padding:"0.6rem 1rem",background:"var(--bg-secondary)",borderRadius:"var(--radius)",fontSize:11,color:"var(--text-secondary)",lineHeight:1.7}}>Directional estimates based on historical factor sensitivities. Treat as risk awareness, not precise predictions.</div>
    </div>}

    {tab==="rebalance"&&<div>
      <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
        <div style={s.card}><div style={s.sec}>Top-level targets</div>
          {targets.funds+targets.stocks+targets.crypto!==100&&<div style={{fontSize:11,color:"var(--red)",marginBottom:8,padding:"4px 8px",background:"var(--red)"+"12",borderRadius:"var(--radius)"}}>Must sum to 100% (currently {targets.funds+targets.stocks+targets.crypto}%)</div>}
          {[{k:"funds",l:"Funds",c:CC.equity,cur:fPct},{k:"stocks",l:"Stocks",c:CC.stock,cur:0},{k:"crypto",l:"Crypto",c:CC.crypto,cur:cPct}].map(({k,l,c,cur})=>{
            const drift=cur-targets[k]/100,over=Math.abs(drift)>thD;
            return <div key={k} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:500}}>{l}</span>
                <div style={{display:"flex",gap:8,fontSize:11}}><span style={{color:"var(--text-secondary)"}}>Actual: {pct(cur)}</span>
                  <span style={{fontWeight:500,color:over?"var(--red)":"var(--green)"}}>{drift>=0?"+":""}{(drift*100).toFixed(1)}%</span></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min={0} max={100} step={5} value={targets[k]} onChange={e=>setTargets(p=>({...p,[k]:+e.target.value}))} style={{flex:1}}/><span style={{fontSize:13,fontWeight:500,minWidth:34,textAlign:"right",color:c}}>{targets[k]}%</span></div>
            </div>;})}
          <div style={{marginTop:8,paddingTop:8,borderTop:"0.5px solid var(--border)"}}>
            <div style={{fontSize:11,color:"var(--text-secondary)",marginBottom:4}}>Drift threshold: ±{threshold}%</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min={1} max={10} step={1} value={threshold} onChange={e=>setThreshold(+e.target.value)} style={{flex:1}}/><span style={{fontSize:12,fontWeight:500}}>{threshold}%</span></div>
          </div>
        </div>
        <div style={s.card}><div style={s.sec}>Sub-asset targets (within funds)</div>
          {[{k:"equity",l:"Equity ETFs",c:CC.equity,cur:totalCad>0?holdings.filter(h=>h.category==="equity").reduce((a,h)=>a+h.mvCad,0)/totalCad:0},{k:"bond",l:"Bond ETFs",c:CC.bond,cur:totalCad>0?holdings.filter(h=>h.category==="bond").reduce((a,h)=>a+h.mvCad,0)/totalCad:0},{k:"gold",l:"Gold ETFs",c:CC.gold,cur:totalCad>0?holdings.filter(h=>h.category==="gold").reduce((a,h)=>a+h.mvCad,0)/totalCad:0}].map(({k,l,c,cur})=>{
            const drift=cur-subTargets[k]/100,over=Math.abs(drift)>thD;
            return <div key={k} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:500}}>{l}</span>
                <div style={{display:"flex",gap:8,fontSize:11}}><span style={{color:"var(--text-secondary)"}}>Actual: {pct(cur)}</span>
                  <span style={{fontWeight:500,color:over?"var(--red)":"var(--green)"}}>{drift>=0?"+":""}{(drift*100).toFixed(1)}%</span></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><input type="range" min={0} max={100} step={5} value={subTargets[k]} onChange={e=>setSubTargets(p=>({...p,[k]:+e.target.value}))} style={{flex:1}}/><span style={{fontSize:13,fontWeight:500,minWidth:34,textAlign:"right",color:c}}>{subTargets[k]}%</span></div>
            </div>;})}
          <div style={{padding:"0.4rem 0.6rem",background:"var(--bg-secondary)",borderRadius:"var(--radius)",fontSize:11,color:"var(--text-secondary)"}}>Remaining: {Math.max(0,targets.funds-subTargets.equity-subTargets.bond-subTargets.gold)}% unassigned</div>
        </div>
      </div>
      <div style={{...s.g("1fr 1fr"),marginBottom:"1.2rem"}}>
        <div style={s.card}><div style={s.sec}>Fee budget</div>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
            <span style={{fontSize:20,fontWeight:500,color:feeOverBudget?"var(--red)":"var(--green)"}}>{fmtD(totalFees)}</span>
            <span style={{fontSize:12,color:"var(--text-secondary)"}}>/ {fmtD(feeBudget)} budget/yr</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <input type="range" min={50} max={500} step={10} value={feeBudget} onChange={e=>setFeeBudget(+e.target.value)} style={{flex:1}}/>
            <span style={{fontSize:12,fontWeight:500,minWidth:48}}>{fmtD(feeBudget)}</span>
          </div>
          <div style={{height:6,background:"var(--bg-tertiary)",borderRadius:4,overflow:"hidden",marginBottom:8}}>
            <div style={{width:Math.min((totalFees/feeBudget)*100,100)+"%",height:"100%",background:feeOverBudget?"var(--red)":"var(--green)",borderRadius:4}}/>
          </div>
          {feeOverBudget&&feeTrades.length>0&&<div>
            <div style={{fontSize:11,fontWeight:500,color:"var(--red)",marginBottom:4}}>Fee reduction suggestions</div>
            {feeTrades.map(t=><div key={t.sym} style={{padding:"5px 0",borderBottom:"0.5px solid var(--border)",fontSize:11}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontWeight:500}}>{t.sym}</span><span style={{flex:1,color:"var(--text-secondary)"}}>{t.name}</span><span style={s.badge("var(--red)")}>{t.mer}%</span><span style={{color:"var(--text-secondary)"}}>{fmtD(t.fee)}/yr</span></div></div>)}
          </div>}
          {!feeOverBudget&&<div style={{fontSize:12,color:"var(--green)"}}>Within budget. {fmtD(feeBudget-totalFees)} headroom.</div>}
        </div>
        <div style={s.card}><div style={s.sec}>Suggested trades</div>
          {trades.length===0&&<div style={{fontSize:12,color:"var(--text-secondary)"}}>Portfolio within targets.</div>}
          {trades.map((t,i)=><div key={i} style={{padding:"7px 0",borderBottom:"0.5px solid var(--border)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
              <span style={{fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:"var(--radius)",background:t.action==="BUY"?"var(--green)"+"1a":"var(--red)"+"1a",color:t.action==="BUY"?"var(--green)":"var(--red)"}}>{t.action}</span>
              <span style={{fontSize:12,fontWeight:500}}>{t.sym}</span><span style={{fontSize:11,color:"var(--text-secondary)",flex:1}}>{t.name}</span>
              <span style={{fontSize:13,fontWeight:500}}>{fmt(t.amount)}</span>
            </div>
            <div style={{fontSize:11,color:"var(--text-secondary)"}}>{t.reason}</div>
          </div>)}
          {trades.length>0&&<div style={{marginTop:8,fontSize:10,color:"var(--text-tertiary)",lineHeight:1.6}}>Prioritizes self-directed accounts. Execute manually in Wealthsimple.</div>}
        </div>
      </div>
      <div style={s.card}><div style={s.sec}>Sector targets vs actual</div>
        <div style={{...s.g("1fr 1fr"),gap:6}}>
          {sectorDiffs.map(se=>{const over=Math.abs(se.diff)>3;
            return <div key={se.s} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0"}}>
              <div style={{width:8,height:8,borderRadius:2,background:SC[se.s]||"#888",flexShrink:0}}/>
              <span style={{fontSize:11,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{se.s}</span>
              <input type="number" min={0} max={50} value={se.target} onChange={e=>setSectorTargets(p=>({...p,[se.s]:Math.max(0,Math.min(50,+e.target.value||0))}))} style={{width:40,textAlign:"right"}}/>
              <span style={{fontSize:10,color:"var(--text-secondary)",width:7}}>%</span>
              <span style={{fontSize:11,color:"var(--text-secondary)",minWidth:26,textAlign:"right"}}>{pct(se.p)}</span>
              <span style={{fontSize:11,fontWeight:500,color:over?(se.diff>0?"var(--green)":"var(--red)"):"var(--text-secondary)",minWidth:38,textAlign:"right"}}>{se.diff>=0?"+":""}{se.diff.toFixed(1)}%</span>
            </div>;})}
        </div>
      </div>
    </div>}
  </div>;
}
