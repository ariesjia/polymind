# PolyMind — AI Prediction Analyzer

An AI-powered analysis tool for [Polymarket](https://polymarket.com/) prediction markets. Browse events, explore market data, and get AI-driven insights on outcome probabilities.

**Live Demo:** [polymind-rho.vercel.app](https://polymind-rho.vercel.app/)

## Features

### Event Browsing

- Grid view of live Polymarket events with images, market count, and volume
- Paginated loading (50 events per page) with infinite scroll
- Click any event to open a detailed side drawer

### Market Data

- Yes/No outcome probability bars for each market
- Key metrics: volume, liquidity, bid/ask spread
- Real-time order book depth (bids & asks) via CLOB API
- Daily reward eligibility indicators

### AI Analysis

- One-click AI analysis of any event's markets
- Streaming response with real-time Markdown rendering (tables, lists, etc.)
- Works with **any OpenAI-compatible API** — use OpenAI, MiniMax, DeepSeek, local models, or any provider
- Customizable prompt template with variable interpolation (`${event.title}`, `${marketsText}`, etc.)
- Prompt preview/test tool in settings

### Web Search Integration

- Optional [Tavily](https://tavily.com/) integration for real-time web search
- AI autonomously decides when to search for supplementary information
- Search progress displayed with status indicators
- Up to 3 search rounds per analysis

### Analysis History

- All AI analyses are automatically saved to local storage
- History sidebar to review, re-read, or delete past analyses
- Restore previous analysis when revisiting an event

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |
| HTTP | Axios (Polymarket API), Fetch (AI streaming) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js >= 18
- An OpenAI-compatible API key (OpenAI, MiniMax, DeepSeek, etc.)
- (Optional) A [Tavily API key](https://tavily.com/) for web search

### Install & Run

```bash
git clone https://github.com/your-username/polymind.git
cd polymind
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Configuration

Click the **Settings** icon in the top-right corner to configure:

| Field | Description |
|-------|-------------|
| API Base URL | Your AI provider's base URL (e.g. `https://api.openai.com`) |
| API Key | Your API key |
| Model | Model name (e.g. `gpt-5`,) |
| Tavily API Key | (Optional) Enables AI web search capability |
| Prompt Template | Customize the analysis prompt with event/market variables |

All settings are stored in your browser's local storage — nothing is sent to any server other than the AI provider you configure.

### Build for Production

```bash
npm run build
npm run preview
```

## License

MIT
