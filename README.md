# Portfolio Dashboard

A self-hosted portfolio monitoring tool for Wealthsimple users. Upload your holdings CSV, get live pricing, and use interactive rebalancing, exposure analysis, and stress testing.

## Features

- **CSV Upload**: Drag-and-drop your Wealthsimple holdings report
- **Live Pricing**: Refresh prices via Yahoo Finance (free, no API key needed)
- **Exposure Analysis**: Look-through sector, geographic, and individual stock exposures across all ETFs, plus currency exposure, bond duration and equity beta (approximate, from data stored in the app)
- **Stress Testing**: 7 preset macro scenarios (recession, rate hike, tech crash, etc.)
- **Dynamic Rebalancing**: Adjustable targets for asset class, sub-asset, sector, and fee budget with auto-generated trade suggestions
- **TPA tab**: Role tag for every position, what it replaces, share of portfolio risk (illustrative assumptions), and checks against your written policy (satellite budget, position limit, crypto cap, cash buffer, credit line)
- **Balance sheet tab**: Whole-of-life asset mix including pensions you enter by hand, the four buckets, and liabilities. Amounts you type are stored in your browser only
- **Persistent Settings**: All your targets and preferences saved in browser localStorage
- **Dark Mode**: Automatic based on system preference

## Getting your Wealthsimple CSV

1. Log into Wealthsimple **web** (not mobile)
2. Go to **Statements** → **Custom statements**
3. Select **Holdings report**
4. Choose all accounts and download

## Deploy to Vercel (recommended, ~5 minutes)

### Prerequisites
- A GitHub account
- A Vercel account (free at vercel.com)

### Steps

1. **Push to GitHub**:
   ```bash
   cd portfolio-dashboard
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create portfolio-dashboard --private --push
   ```
   Or create a repo on github.com and push manually.

2. **Deploy on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo
   - Click **Deploy** (no configuration needed)
   - Your dashboard will be live at `https://portfolio-dashboard-xxx.vercel.app`

3. **Access your dashboard**:
   - Open the Vercel URL
   - Upload your Wealthsimple CSV
   - Click "Refresh prices" for live data

### Privacy note
Your portfolio data never leaves your browser except for the price fetch API call, which only sends ticker symbols (not quantities, values, or personal info) to Yahoo Finance.

## Run locally

```bash
cd portfolio-dashboard
npm install
npm run dev
```

Open http://localhost:3000

## How it works

- **Holdings data**: Parsed from your Wealthsimple CSV, stored in browser localStorage
- **Live prices**: Fetched server-side via Yahoo Finance API (through a Next.js API route to avoid CORS issues)
- **Sector/geo data**: Embedded in the app based on fund provider published allocations. These are approximate and updated periodically
- **Stress testing**: Directional estimates based on historical factor sensitivities. Not a quantitative risk model — treat as risk awareness
- **Settings**: All targets, thresholds, and preferences persist in localStorage

## Updating your portfolio

1. Export a new CSV from Wealthsimple (monthly recommended)
2. Click "Upload CSV" in the dashboard header
3. Click "Refresh prices" for current market values

## File structure

```
portfolio-dashboard/
├── app/
│   ├── api/
│   │   └── prices/
│   │       └── route.js      # Yahoo Finance proxy
│   ├── globals.css            # Styles
│   ├── layout.jsx             # Root layout
│   └── page.jsx               # Main dashboard
├── next.config.js
├── package.json
└── README.md
```

## Future enhancements

- Proper Python backend with historical factor model for stress testing
- Amplenote research database integration
- Passiv API integration for automatic holdings sync
- Transaction history tracking and performance attribution
