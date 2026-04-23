# AlphaScope
A **comprehensive Solana token analysis platform** powered by advanced scoring algorithms, real-time market data, and AI-driven insights. AlphaScope provides traders and investors with actionable intelligence to identify high-conviction opportunities and manage risk across the Solana ecosystem.

---

## 🎯 Overview

AlphaScope combines on-chain metrics, security analysis, and market momentum indicators into **composite scoring models** that rank tokens across **Risk**, **Opportunity**, **Momentum**, **Liquidity**, and **Security** dimensions. Users can:

- 📊 **Score trending tokens** with AI-generated analysis
- 🎯 **Track watchlisted tokens** with live scoring updates
- 📈 **Compare up to 3 tokens** side-by-side with detailed metrics
- 💹 **View interactive price charts** with multiple timeframes
- 🌐 **Multi-chain support** — Analyze tokens across Solana, Ethereum, BSC, and Base
- 🔍 **Search and filter** across thousands of tokens across all supported chains
- ⚡ **Receive security flags** for mutable metadata, freeze authority, LP locks, and Token-2022 risks

---

## ✨ Key Features

### 1. **Token Scoring Engine**
Composite scoring across five key dimensions:
- **Risk**: Age, holder count, liquidity floor analysis
- **Opportunity**: Price momentum, market cap, breakout potential
- **Momentum**: Volume trends, buy/sell confirmation signals
- **Liquidity**: On-chain pool depth and DEX availability
- **Security**: Authority flags, LP burn status, concentration metrics

### 2. **Real-Time Dashboard**
- New token listings (30m, 1h, 2h, 6h, 24h windows)
- Trending tokens with live rank updates
- Interactive scoring dashboard with filters and sorting
- Verdict badges: **BUY** | **WATCH** | **AVOID**

### 3. **Token Detail Pages**
- Token overview with price, volume, and market cap
- AI-powered insights (via Google Gemini)
- Security analysis and flags
- Candlestick price charts (15 timeframes: 1m to 1M)
- Scoring breakdown and signal analysis
- External links to Solscan, DEX aggregators

### 4. **Watchlist Management**
- Star/bookmark tokens from any page
- Persistent local storage
- Auto-refreshing watchlist with live scores
- Compare functionality for side-by-side analysis

### 5. **Compare Tool**
- Select up to 3 tokens
- View metrics side-by-side
- Score comparison visualization
- Risk/opportunity tradeoff analysis

### 6. **Real-Time Telegram Alerts** 🔔
- **Live market signals** delivered to Telegram
- **New token opportunities** (scoring ≥ 60)
- **Trending breakouts** (volume spike > 100% or price spike > 30%)
- **High-signal filtering** to reduce noise
- **Duplicate suppression** within process lifetime
- **Shared broadcast model** — no auth required

Join the AlphaScope alerts channel to receive real-time notifications:
📲 **[Join Telegram](https://t.me/+1FkYzkxGf80zNTc0)**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Framer Motion |
| **Framework** | Next.js 16 (App Router, Server Components, Turbopack) |
| **State Management** | React Context API (compare, watchlist) |
| **Charts** | lightweight-charts 5.1.0 |
| **Data Source** | Birdeye API (Solana on-chain data) |
| **AI Insights** | Google Gemini API (fallback to deterministic text) |
| **Caching** | Next.js ISR with revalidation tags |
| **Styling** | Custom design system with dark theme |

---

## 📡 Birdeye API Integration

AlphaScope uses the **Birdeye API** to fetch real-time and historical token data. All endpoints are server-side only (API key never exposed to browser).

### Endpoints Used

| Endpoint | Purpose | Cache | Parameters |
|----------|---------|-------|-----------|
| **`/defi/v2/tokens/new_listing`** | New token listings | 15s | `sort_by`, `sort_type`, `type`, `limit` |
| **`/defi/token_trending`** | Top trending tokens | 30s | `sort_by`, `sort_type`, `offset`, `limit` |
| **`/defi/token_overview`** | Token price & metrics | 60s | `address` |
| **`/defi/token_security`** | Security flags & analysis | 5m | `address` |
| **`/defi/ohlcv`** | Candlestick price data | 60s (intraday) / 5m (daily+) | `address`, `type`, `time_from`, `time_to` |
| **`/defi/v3/search`** | Token search | — | `query`, `chain` |

**Rate Limiting**: 150ms minimum gap between requests (configurable for pro tier)

---

## � Future Roadmap

1. **User Accounts & Portfolios** — Track P&L, save custom watchlists across devices
2. **Advanced Alerts** — Email, Discord, webhooks, custom thresholds
3. **Strategy Backtesting** — Validate trading rules against historical data

---

## �🚀 Getting Started

### Prerequisites
- Node.js 18+ (recommended 20 LTS)
- npm or yarn package manager
- Birdeye API key ([get one here](https://birdeye.so/api))
- Google Gemini API key (optional, for AI insights)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JUICEWRLD998/alphascope.git
   cd alphascope
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your API keys:
   ```env
   # Required: Birdeye API key from https://birdeye.so/api
   BIRDEYE_API_KEY=your_api_key_here

   # Optional: Google Gemini API key from https://aistudio.google.com/app/apikey
   # If not set, AI insights fall back to deterministic text
   GEMINI_API_KEY=your_gemini_key_here

   # Optional: Telegram notifications for real-time alerts
   # Get bot token from Telegram's BotFather, chat ID from your group/channel
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here

   # Optional: Public app URL (for Telegram links; defaults to production URL)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```


4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
alphascope/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/          # Main dashboard
│   │   ├── radar/              # New token radar
│   │   ├── trending/           # Trending tokens
│   │   ├── scores/             # Full scoring board
│   │   ├── watchlist/          # Saved tokens
│   │   └── token/[address]/    # Token detail page
│   ├── api/
│   │   └── tokens/
│   │       ├── overview/       # Token price/volume API
│   │       ├── ohlcv/          # Candlestick chart API
│   │       ├── security/       # Security flags API
│   │       ├── trending/       # Trending tokens API
│   │       ├── new/            # New listings API
│   │       └── search/         # Token search API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── OHLCVChart.tsx
│   │   ├── CompareButton.tsx
│   │   ├── WatchlistButton.tsx
│   │   └── ...
│   └── dashboard/              # Feature components
├── lib/
│   ├── types.ts               # TypeScript definitions
│   ├── scoring.ts             # Scoring algorithm
│   ├── compare.tsx            # Compare context
│   ├── watchlist.ts           # Watchlist store
│   ├── insights.ts            # AI insights generation
│   ├── constants.ts
│   └── utils.ts
├── services/
│   ├── birdeye.ts             # Birdeye API wrapper
│   └── gemini.ts              # Google Gemini integration
├── public/                     # Static assets
└── next.config.ts             # Next.js configuration
```

---

## 🏗️ Architecture

### Data Flow
```
Browser
  ↓
Next.js Route Handler (/api/tokens/*)
  ↓
Birdeye Service Layer (services/birdeye.ts)
  ↓
Birdeye API
  ↓
Next.js ISR Cache (revalidate + tags)
  ↓
Browser
```

### Scoring Algorithm
1. **Data Aggregation**: Fetch token metrics (price, volume, holders, liquidity)
2. **Normalization**: Convert raw metrics to 0-100 scale
3. **Sub-scoring**: Calculate individual dimension scores
4. **Composite**: Weight and combine into overall score (0-100)
5. **Verdict**: Classify as BUY, WATCH, or AVOID

### Caching Strategy
- **Short-lived (15-60s)**: Trending, new listings (volatile data)
- **Medium (60s)**: Token overview (price updates)
- **Long-lived (5m)**: Security, OHLCV (static metadata)
- **On-demand revalidation**: Via `invalidateTag()` after user actions

---

## 🎮 Usage

### Explore Tokens
1. Navigate to **Radar** for newly listed tokens
2. Browse **Trending** for hot movers
3. View full **Score Board** for comprehensive analysis

### Find Opportunities
- Use **filters** (BUY/WATCH/AVOID verdicts)
- **Sort** by risk, opportunity, or momentum
- Compare tokens with the **Compare** button (max 3)

### Build Your Watchlist
- **Star** any token to save it
- View all saved tokens in **Watchlist**
- Auto-refreshing scores every 30 seconds

### Deep Dive Analysis
- Click any token to see detailed page
- Read AI-generated insights
- View security flags and risks
- Analyze price chart with multiple timeframes

---

## 🔒 Security

- **API keys**: Never exposed to browser (server-side only)
- **Environment variables**: Stored in `.env.local` (never committed)
- **Rate limiting**: Built-in protection against API quota exhaustion
- **Input validation**: All user inputs sanitized and typed
- **CORS**: Properly configured for production

---

## 📊 Performance Optimizations

- **Next.js ISR**: Incremental Static Regeneration reduces API calls
- **Server Components**: Heavy lifting on the server, light client payloads
- **Code splitting**: Dynamic imports for large components (charts)
- **Image optimization**: Next.js Image component with lazy loading
- **Bundle analysis**: ESLint + TypeScript strict mode

---

## 🔔 Telegram Notifications

AlphaScope sends real-time market alerts to a shared Telegram channel. The notification system is **fully automated, no-auth required**, and uses intelligent filtering to minimize noise.

### Alert Types

| Type | Trigger | Example |
|------|---------|---------|
| **New Opportunity** | New token listing with BUY verdict and score ≥ 60 | "🟢 SOL — New Opportunity" |
| **Trending Breakout** | Token with volume spike ≥ 100% OR price spike ≥ 30% | "⚡ BONK — Breakout (Vol +150% · Price +45%)" |

### Telegram Thresholds
- **In-app**: All opportunities (score ≥ 60) and breakouts (any spike)
- **Telegram high-signal**: Opportunities (score ≥ 70) + breakouts (vol ≥ 150% OR price ≥ 50%)

This dual-tier approach keeps in-app comprehensive while keeping Telegram low-noise for the channel.

### How It Works
1. Browser-based polling (every 60 seconds)
2. `/api/notifications` endpoint fetches trending + new tokens from Birdeye
3. Scores each token and filters to high-signal alerts
4. Deduplicates using in-process memory tracking to prevent spam
5. Dispatches qualifying alerts to Telegram (non-blocking, doesn't affect user latency)
6. Returns in-app notifications immediately

### How Telegram Alerts Work
- Alerts are sent **only when users are actively using the app** (via browser polling)
- The notification system runs on client-side polling, so Telegram messages appear within ~60 seconds of qualifying events
- To receive continuous 24/7 alerts, the channel link must be monitored independently

### Join the Channel
📲 **[AlphaScope Alerts on Telegram](https://t.me/+1FkYzkxGf80zNTc0)**

---

## 🚢 Deployment

### Deploy on Vercel (Recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard:
   ```
   BIRDEYE_API_KEY=your_api_key_here
   GEMINI_API_KEY=your_gemini_key_here
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```
4. Deploy:
   ```bash
   vercel deploy
   ```

Telegram alerts will be sent when users access the app and trigger the polling endpoint.

### Deploy on Other Platforms
```bash
npm run build
npm run start
```

---

## 📝 License

This project is open-source and available under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for the Solana community**
